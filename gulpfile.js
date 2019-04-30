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
var imageminJpgtr= require('imagemin-jpegtran');
var cache        = require('gulp-cache');
var autoprefixer = require('gulp-autoprefixer');
var notify       = require('gulp-notify');

var browserSync  = require('browser-sync');
var php          = require('gulp-connect-php');
var ftp          = require('vinyl-ftp');
var del          = require('del');

var syntax       = 'sass'; // sass or scss;

//minify css/js
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
gulp.task('minify-styles', function() {
    return gulp.src('app/' + syntax + '/**/*.' + syntax)
        .pipe(sass({outputStyle: 'expand'}).on("error", notify.onError()))
        .pipe(rename({suffix: '.min', prefix : ''}))
        .pipe(autoprefixer(['last 25 versions']))
        .pipe(concat('script.min.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('app/css'))
        .pipe(browserSync.reload({stream: true}));

});
gulp.task('minify', gulp.parallel('minify-js', 'minify-styles'));

// compress image
gulp.task('compress-img', function (cb) {
    gulp.src('app/img/**/*')
        //.pipe(gulp.dest('dest/img')) //Копируем изображения заранее, imagemin может "забагать")
        // .pipe(cache(imagemin([
        //     imagemin.gifsicle({interlaced: true}),

        //     imageminPng({quality: '80'}),
        //     imagemin.svgo({plugins: [{removeViewBox: true}]})
        // ])))
        .pipe(cache(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imageminJpgtr({progressive: true}),
            imageminPng({quality: '80'}),
            imagemin.svgo({plugins: [{removeViewBox: true}]})
            ], {verbose: true}
        )))
        .pipe(gulp.dest('dest/img'));
    cb();
});


gulp.task('remove-dest', function(cb) {
    del.sync('dest');
    cb();
});

gulp.task('create-dest', function(cb) {
    gulp.src([
        'app/*.html',
        'app/*.php',
        'app/.htaccess',
    ], {allowEmpty: true}).pipe(gulp.dest('dest'));

    gulp.src([
        'app/css/script.min.css',
    ]).pipe(gulp.dest('dest/css'));

    gulp.src([
        'app/js/script.min.js',
    ]).pipe(gulp.dest('dest/js'));

    gulp.src([
        'app/fonts/**/*',
    ]).pipe(gulp.dest('dest/fonts'));
    cb();
});

gulp.task('build', gulp.series('remove-dest', 'compress-img', 'minify', 'create-dest'));


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


gulp.task('clearcache', function () { return cache.clearAll(); });

gulp.task('php-server', function() {
    php.server({ base: 'app', port: 8010, keepalive: true});
});


gulp.task('bs', function() {
    browserSync({
        proxy: '127.0.0.1:8010',
        port: 8080,
        open: true,
        notify: false
    });
});

gulp.task('browser-sync', gulp.parallel('php-server', 'bs'));

gulp.task('code', function() {
    return gulp.src('app/*.php')
        .pipe(browserSync.reload({ stream: true }))
});


gulp.task('watch', function() {
    gulp.watch('app/' + syntax + '/**/*.' + syntax, gulp.series('minify-styles'));
    gulp.watch(['app/libs/**/*.js', 'app/js/main.js'], gulp.series('minify-js'));
    gulp.watch('app/*.php', gulp.series('code'));
});

gulp.task('default', gulp.parallel('minify', 'browser-sync', 'watch'));
