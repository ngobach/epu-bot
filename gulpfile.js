require('dotenv').config();

const gulp = require('gulp');
const sass = require('gulp-sass');
const rename = require('gulp-rename');
const htmlmin = require('gulp-htmlmin');
const replace = require('gulp-replace');


gulp.task('scss', () => {
    return gulp.src('public/src/style.scss')
        .pipe(sass({ outputStyle: 'compressed' }))
        .pipe(rename('style.min.css'))
        .pipe(gulp.dest('public'));
});

gulp.task('html', () => {
    return gulp.src('public/src/index.html')
        .pipe(replace(':SITE_URL:', process.env.SITE_URL))
        .pipe(htmlmin({
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            minifyJS: true,
            removeComments: true
        }))
        .pipe(gulp.dest('public'));
});

gulp.task('watch', () => {
    gulp.watch('public/src/style.scss', ['scss']);
    gulp.watch('public/src/index.html', ['html']);
});

gulp.task('default', ['html', 'scss', 'watch']);