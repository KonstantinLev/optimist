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
var paths = {
    views: {
        src: [
            'app/*.html',
            'app/*.php',
            'app/.htaccess'
        ],
        dest: 'dest',
        watch: 'app/*.php'
    },
    styles: {
        src: 'app/css',
        minName: 'script.min.css',
        dest: 'dest/css',
        watch: 'app/' + syntax + '/**/*.' + syntax
    },
    scripts: {
        src: 'app/js',
        minName: 'script.min.js',
        dest: 'dest/js',
        watch: [
            'app/libs/**/*.js', //todo add manualy?
            'app/js/main.js'
        ]
    },
    images: {
        src: 'app/img/**/*',
        dest: 'dest/img',
        watch: 'app/img/**/*'
    },
    fonts: {
        src: 'app/fonts/**/*',
        dest: 'dest/fonts',
        watch: 'app/fonts/**/*'
    },
    configs: {
        php: {
            base: 'app',
            port: 8010,
            keepalive: true
        },
        browserSync: {
            proxy: '127.0.0.1:8010',
            port: 8080,
            open: true,
            notify: false,
            //tunnel: true //for customer demonstration =)
        },
        ftp: {
            host:      'host',
            user:      'user',
            password:  'password',
            parallel:  10,
            log: gutil.log
        }
    }
};

//minify css/js
gulp.task('minify-js', function() {
    return gulp.src(paths.scripts.watch)
        .pipe(concat(paths.scripts.minName))
        .pipe(uglify())
        .pipe(gulp.dest(paths.scripts.src))
        .pipe(browserSync.reload({stream: true}));
});
gulp.task('minify-styles', function() {
    return gulp.src(paths.styles.watch)
        .pipe(sass({outputStyle: 'expand'}).on("error", notify.onError()))
        .pipe(rename({suffix: '.min', prefix : ''}))
        .pipe(autoprefixer(['last 25 versions']))
        .pipe(concat(paths.styles.minName))
        .pipe(cleanCSS())
        .pipe(gulp.dest(paths.styles.src))
        .pipe(browserSync.reload({stream: true}));

});
gulp.task('minify', gulp.parallel('minify-js', 'minify-styles'));

// compress image
gulp.task('compress-img', function (cb) {
    gulp.src(paths.images.src)
        //.pipe(gulp.dest('dest/img')) //Копируем изображения заранее, imagemin может "забагать")
            //todo
        // [
        // imagemin.gifsicle({interlaced: true}),
        //     imageminJpgtr({progressive: true}),
        //     imageminPng({quality: '80'}),
        //     imagemin.svgo({plugins: [{removeViewBox: true}]})
        // ]
        .pipe(cache(imagemin({verbose: true})))
        .pipe(gulp.dest(paths.images.dest));
    cb();
});

gulp.task('remove-dest', function(cb) {
    del.sync(paths.views.dest);
    cb();
});

gulp.task('create-dest', function(cb) {
    gulp.src(paths.views.src, {allowEmpty: true}).pipe(gulp.dest(paths.views.dest));
    gulp.src(paths.styles.src + '/' + paths.styles.minName).pipe(gulp.dest(paths.styles.dest));
    gulp.src(paths.scripts.src + '/' + paths.scripts.minName).pipe(gulp.dest(paths.scripts.dest));
    gulp.src(paths.fonts.src).pipe(gulp.dest(paths.fonts.dest));
    cb();
});

gulp.task('build', gulp.series('remove-dest', 'compress-img', 'minify', 'create-dest'));

//deploy files on your server
gulp.task('deploy', function() {
    var conn = ftp.create(paths.configs.ftp);
    var globs = [
        'dest/**',
        'dest/.htaccess',
    ];
    return gulp.src(globs, {buffer: false})
        .pipe(conn.dest('path/to/folder/on/server'));
});

gulp.task('clearcache', function () { return cache.clearAll(); });

gulp.task('php-server', function() {
    php.server(paths.configs.php);
});

gulp.task('bs', function() {
    browserSync(paths.configs.browserSync);
});

gulp.task('browser-sync', gulp.parallel('php-server', 'bs'));

gulp.task('code', function() {
    return gulp.src(paths.views.watch)
        .pipe(browserSync.reload({ stream: true }))
});

gulp.task('watch', function() {
    gulp.watch(paths.styles.watch, gulp.series('minify-styles'));
    gulp.watch(paths.scripts.watch, gulp.series('minify-js'));
    gulp.watch(paths.views.watch, gulp.series('code'));
});

gulp.task('default', gulp.parallel('browser-sync', 'watch'));