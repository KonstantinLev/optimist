var gulp         = require('gulp');
var gutil        = require('gulp-util');
var sass         = require('gulp-sass');
var concat       = require('gulp-concat');
var uglify       = require('gulp-uglify');
var cleanCSS     = require('gulp-clean-css');
var rename       = require('gulp-rename');
var imagemin     = require('gulp-imagemin');
var cache        = require('gulp-cache');
var autoprefixer = require('gulp-autoprefixer');
var notify       = require('gulp-notify');

var browserSync  = require('browser-sync');
var ftp          = require('vinyl-ftp');
var del          = require('del');

gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: 'app'
        },
        notify: false
    });
});

gulp.task('commonJs', function() {
    return gulp.src([
        'app/js/common.js',
    ])
    .pipe(concat('common.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('app/js'));
});

gulp.task('js', ['commonJs'], function() {
    return gulp.src([
        'app/libs/jquery/dist/jquery.min.js',
        'app/js/common.min.js', // всегда в конце
    ])
    .pipe(concat('main.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('app/js'))
    .pipe(browserSync.reload({stream: true}));
});

gulp.task('sass', function() {
    return gulp.src('app/sass/**/*.sass')
        .pipe(sass({outputStyle: 'expand'}).on("error", notify.onError()))
        .pipe(rename({suffix: '.min', prefix : ''}))
        .pipe(autoprefixer(['last 15 versions']))
        .pipe(cleanCSS())
        .pipe(gulp.dest('app/css'))
        .pipe(browserSync.reload({stream: true}));
});

gulp.task('imagemin', function() {
    return gulp.src('app/img/**/*')
        .pipe(cache(imagemin()))
        .pipe(gulp.dest('dist/img'));
});

gulp.task('build', ['removedist', 'imagemin', 'sass', 'js'], function() {

    gulp.src([
        'app/*.html',
        'app/.htaccess',
    ]).pipe(gulp.dest('dist'));

    gulp.src([
        'app/css/main.min.css',
    ]).pipe(gulp.dest('dist/css'));

    gulp.src([
        'app/js/main.min.js',
    ]).pipe(gulp.dest('dist/js'));

    gulp.src([
        'app/fonts/**/*',
    ]).pipe(gulp.dest('dist/fonts'));

});

gulp.task('deploy', function() {

    var conn = ftp.create({
        host:      'host',
        user:      'user',
        password:  'password',
        parallel:  10,
        log: gutil.log
    });

    var globs = [
        'dist/**',
        'dist/.htaccess',
    ];
    return gulp.src(globs, {buffer: false})
        .pipe(conn.dest('path/to/folder/on/server'));

});

gulp.task('removedist', function() { return del.sync('dist'); });
gulp.task('clearcache', function () { return cache.clearAll(); });

gulp.task('watch', ['sass', 'js', 'browser-sync'], function() {
    gulp.watch('app/sass/**/*.sass', ['sass']);
    gulp.watch(['libs/**/*.js', 'app/js/common.js'], ['js']);
    gulp.watch('app/*.html', browserSync.reload);
});

gulp.task('default', ['watch']);