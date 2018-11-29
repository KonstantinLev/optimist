var gulp         = require('gulp');
var gutil        = require('gulp-util');
var sass         = require('gulp-sass');
var concat       = require('gulp-concat');
var uglify       = require('gulp-uglify');
var cleanCSS     = require('gulp-clean-css');
var rename       = require('gulp-rename');
var imagemin     = require('gulp-imagemin');
var imageminJR   = require('imagemin-jpeg-recompress');
var imageminPng  = require('imagemin-pngquant');
var cache        = require('gulp-cache');
var autoprefixer = require('gulp-autoprefixer');
var notify       = require('gulp-notify');

var browserSync  = require('browser-sync');
var php          = require('gulp-connect-php');
var ftp          = require('vinyl-ftp');
var del          = require('del');

//minify css/js
gulp.task('minify', ['minify-js', 'minify-sass']);
gulp.task('minify-js', function() {
    return gulp.src([
        'app/libs/jquery/dist/jquery.min.js',
        'app/js/main.js', // всегда в конце
    ])
        .pipe(concat('script.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('app/js'))
        .pipe(browserSync.reload({stream: true}));
});
gulp.task('minify-sass', function() {
    return gulp.src('app/sass/**/*.sass')
        .pipe(sass({outputStyle: 'expand'}).on("error", notify.onError()))
        .pipe(rename({suffix: '.min', prefix : ''}))
        .pipe(autoprefixer(['last 25 versions']))
        .pipe(concat('script.min.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('app/css'))
        .pipe(browserSync.reload({stream: true}));

});

// compress image
gulp.task('compress-img', function () {
    return gulp.src('app/img/**/*')
        .pipe(gulp.dest('src/img')) //Копируем изображения заранее, imagemin может пропустить парочку )
        .pipe(cache(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imageminJR({
                progressive: true,
                max: 80,
                min: 70
            }),
            imageminPng({quality: '80'}),
            imagemin.svgo({plugins: [{removeViewBox: true}]})
        ])))
        .pipe(gulp.dest('src/img'));
});


//build src application
gulp.task('build', ['remove-src', 'compress-img', 'minify-sass', 'minify-js'], function() {

    gulp.src([
        'app/*.html',
        'app/*.php',
        'app/.htaccess',
    ]).pipe(gulp.dest('src'));

    gulp.src([
        'app/css/script.min.css',
    ]).pipe(gulp.dest('src/css'));

    gulp.src([
        'app/js/script.min.js',
    ]).pipe(gulp.dest('src/js'));

    gulp.src([
        'app/fonts/**/*',
    ]).pipe(gulp.dest('src/fonts'));
});

//deploy files on your server
gulp.task('deploy', function() {

    var conn = ftp.create({
        host:      'host',
        user:      'user',
        password:  'password',
        parallel:  10,
        log: gutil.log
    });

    var globs = [
        'src/**',
        'src/.htaccess',
    ];
    return gulp.src(globs, {buffer: false})
        .pipe(conn.dest('path/to/folder/on/server'));

});

gulp.task('remove-src', function() { return del.sync('src'); });
gulp.task('clearcache', function () { return cache.clearAll(); });

gulp.task('php', function() {
    php.server({ base: 'app', port: 8010, keepalive: true});
});

gulp.task('browser-sync', ['php'], function() {
    browserSync({
        proxy: '127.0.0.1:8010',
        port: 8080,
        open: true,
        notify: false
    });
});

gulp.task('watch', ['minify-sass', 'minify-js', 'browser-sync'], function() {
    gulp.watch('app/sass/**/*.sass', ['minify-sass']);
    gulp.watch(['app/libs/**/*.js', 'app/js/main.js'], ['minify-js']);
    gulp.watch('app/*.php', browserSync.reload);
});

gulp.task('default', ['watch']);