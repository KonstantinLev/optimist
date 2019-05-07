var gulp              = require('gulp');
var gutil             = require('gulp-util');
var sass              = require('gulp-sass');
var concat            = require('gulp-concat');
var uglify            = require('gulp-uglify');
var cleanCSS          = require('gulp-clean-css');
var rename            = require('gulp-rename');
var imagemin          = require('gulp-imagemin');
var imageminPngquant  = require('imagemin-pngquant');
var imageminZopfli    = require('imagemin-zopfli');
var imageminMozjpeg   = require('imagemin-mozjpeg');
var imageminGiflossy  = require('imagemin-giflossy');
var cache             = require('gulp-cache');
var autoprefixer      = require('gulp-autoprefixer');
var notify            = require('gulp-notify');

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
            'app/libs/**/*.js',
            'app/js/**/main.js'
        ]
    },
    images: {
        src: 'app/assets/img/**/*',
        dest: 'dest/assets/img'
    },
    assets: {
        src: ['app/assets/**/*', '!app/assets/img/**'],
        dest: 'dest/assets',
        watch: 'app/assets/**/*'
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

gulp.task('cache:clear', function () { return cache.clearAll(); });

/**
 * Minify css/js
 */
gulp.task('scripts', function() {
    return gulp.src(paths.scripts.watch)
        .pipe(concat(paths.scripts.minName))
        //.pipe(uglify()) //uncommenting for prod
        .pipe(gulp.dest(paths.scripts.src))
        .pipe(browserSync.reload({stream: true}));
});
gulp.task('styles', function() {
    return gulp.src(paths.styles.watch)
        .pipe(sass({outputStyle: 'expand'}).on('error', notify.onError()))
        .pipe(rename({suffix: '.min', prefix : ''}))
        .pipe(autoprefixer(['last 25 versions']))
        .pipe(concat(paths.styles.minName))
        .pipe(cleanCSS())
        .pipe(gulp.dest(paths.styles.src))
        .pipe(browserSync.stream());

});
gulp.task('ss', gulp.parallel('scripts', 'styles'));

/**
 * Compress image (70-80% compression)
 */
gulp.task('img:compress', function (cb) {
    gulp.src(paths.images.src)
        .pipe(imagemin([
            imageminGiflossy({
                optimizationLevel: 3,
                optimize: 3,
                lossy: 2
            }),
            imageminPngquant({
                speed: 5,
                quality: [0.6, 0.8]
            }),
            imageminZopfli({
                more: true
            }),
            imageminMozjpeg({
                progressive: true,
                quality: 70
            }),
            imagemin.svgo({
                plugins: [
                    { removeViewBox: false },
                    { removeUnusedNS: false },
                    { removeUselessStrokeAndFill: false },
                    { cleanupIDs: false },
                    { removeComments: true },
                    { removeEmptyAttrs: true },
                    { removeEmptyText: true },
                    { collapseGroups: true }
                ]
            })
        ]))
        .pipe(gulp.dest(paths.images.dest));
    cb();
});

/**
 * Build production
 */
gulp.task('dest:remove', function(cb) {
    del.sync(paths.views.dest);
    cb();
});
gulp.task('dest:create', function(cb) {
    gulp.src(paths.views.src, {allowEmpty: true}).pipe(gulp.dest(paths.views.dest));
    gulp.src(paths.styles.src + '/' + paths.styles.minName).pipe(gulp.dest(paths.styles.dest));
    gulp.src(paths.scripts.src + '/' + paths.scripts.minName).pipe(gulp.dest(paths.scripts.dest));
    gulp.src(paths.assets.src).pipe(gulp.dest(paths.assets.dest));
    cb();
});
gulp.task('build', gulp.series('dest:remove', 'ss', 'dest:create', 'img:compress'));

/**
 * deploy files on your server
 */
gulp.task('deploy', function() {
    var conn = ftp.create(paths.configs.ftp);
    var globs = [
        'dest/**',
        'dest/.htaccess',
    ];
    return gulp.src(globs, {buffer: false})
        .pipe(conn.dest('path/to/folder/on/server'));
});

/**
 * Start server
 */
gulp.task('php-server', function() {
    php.server(paths.configs.php);
});
gulp.task('browser-sync', function() {
    browserSync.init(paths.configs.browserSync);
});
gulp.task('server', gulp.parallel('php-server', 'browser-sync'));

/**
 * Reload views
 */
gulp.task('views', function() {
    return gulp.src(paths.views.watch)
        .pipe(browserSync.reload({ stream: true }))
});

/**
 * Reload assets
 */
gulp.task('assets', function() {
    return gulp.src(paths.assets.watch, {since: gulp.lastRun('assets')})
        .pipe(browserSync.reload({ stream: true }))
});

/**
 * File monitoring
 */
gulp.task('watch', function() {
    gulp.watch(paths.styles.watch , gulp.series('styles'));
    gulp.watch(paths.scripts.watch, gulp.parallel('scripts'));
    gulp.watch(paths.views.watch  , gulp.series('views'));
    gulp.watch(paths.assets.watch , gulp.series('assets'));
});

gulp.task('default', gulp.series('ss', gulp.parallel('watch', 'server')));