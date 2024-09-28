const browserSync = require('browser-sync').create(),
    del = require('del'),
    path = require('path');

const gulp = require('gulp'),
    dependents = require('gulp-dependents'),
    filter = require('gulp-filter'),
    flatmap = require('gulp-flatmap'),
    gulpIf = require('gulp-if'),
    plumber = require('gulp-plumber'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    watch = require('gulp-watch');

const suffix = {
    min: '.min'
};

// gulp-watch 共用參數
const watchParameter = {
    ignoreInitial: false,
    events: ['add', 'change']
};

// #region Detect build task
let isBuildTask = process.argv.slice(2)[0] == 'build';
// #endregion

// #region Clean(清除所有檔案)
function clean(cb) {
    return del(['./public/**'], cb);
};
// #endregion

// #region Remove(刪除檔案)
const unlink = (file) => {
    let files = [];
    let { dir, name, ext } = path.parse(path.resolve('./public/', path.relative(path.resolve('./src/'), file)));
    if (ext === '.njk') {
        ext = '.html'
    }
    if (ext === '.scss') {
        ext = '.css';
    }
    // original file
    files.push(path.format({ dir: dir, name: name, ext: ext }));
    if (ext === '.js' || ext === '.css') {
        // minify file
        files.push(path.format({ dir: dir, name: name + suffix.min, ext: ext }));
        // sourcemap file
        files.push(path.format({ dir: dir, name: name + suffix.min + ext, ext: '.map' }));
    }
    del(files).then(file => {
        console.log('Below files has been removed.');
        console.log(file);
        browserSync.reload();
    });
};
// #endregion

// #region HTML
// (?:{#.*?#})：排除註解區塊{# #}內的所有文字
let parserRegex = /(?:{#.*?#})|{%\s+(?:extends|include|import|from)\s+(?:"|')(.+?)(?:"|')(?:\s+(?:import|as)\s+(?:\w|\s|,)*)?\s+%}/gm;
let dependentsConfig = {
    '.tmpl': { parserSteps: [parserRegex] },
    '.part': { parserSteps: [parserRegex] },
    '.njk': { parserSteps: [parserRegex, function (url) { return [path.join(path.resolve('./src/'), url)]; }] }
};
const babelCore = require('@babel/core'),
    nunjucksRender = require('gulp-nunjucks-render');
function html(cb) {
    return watch(['./src/**/*.{njk,tmpl,part}', '!./src/assets/lib/', '!./src/assets/lib/**/*'], watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        .on('change', () => browserSync.reload())
        .pipe(dependents(dependentsConfig, { logDependents: true }))
        .pipe(filter(['**', '!**/*.{tmpl,part}']))
        .pipe(flatmap(function (stream, file) {
            return stream
                .pipe(plumber())
                .pipe(nunjucksRender({
                    path: ['./src/'],
                    // envOptions: {
                    //     tags: {
                    //         variableStart: '{$',
                    //         variableEnd: '$}',
                    //     }
                    // },
                    manageEnv: function (env) {
                        env.addFilter('relativePath', function (url, filePath = file.relative) {
                            if (url === '#') {
                                return url;
                            }
                            let current = path.posix.join.apply(path, filePath.split(/\/|\\/));
                            if (!path.posix.isAbsolute(current)) {
                                current = path.posix.sep + current;
                            }
                            let relativePath = path.posix.relative(path.posix.dirname(current), url);
                            if (relativePath.substring(1, 1) !== '.') {
                                relativePath = './' + relativePath;
                            }
                            return relativePath;
                        });

                        env.addFilter('padLeft', function (val, str, len) {
                            val = '' + val;
                            return val.length >= len ? val : new Array(len - val.length + 1).join(str) + val;
                        });

                        env.addFilter('3x', function (fileName) {
                            let parser = path.parse(fileName);
                            return parser.name + '__3x' + parser.ext;
                        });
                    }
                }))
                .pipe(replace(/<script>([\S\s]*?)<\/script>/ig, function (match, p1, offset, string) {
                    var result = babelCore.transform(p1, {
                        configFile: './.babelrc'
                    });
                    return '\n<script>\n' + result.code + '\n</script>\n';
                }));
        }))
        .pipe(gulp.dest('./public/'));
};
// #endregion

// #region Script
const babel = require('gulp-babel'),
    eslint = require('gulp-eslint'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify');
function script(cb) {
    return watch(['./src/**/*.js', '!./src/assets/lib/', '!./src/assets/lib/**/*'], watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        .on('change', () => browserSync.reload())
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
        .pipe(gulpIf(!isBuildTask, sourcemaps.init()))
        .pipe(babel())
        .pipe(gulp.dest('./public/'))
        .pipe(rename({
            suffix: suffix.min
        }))
        .pipe(uglify())
        .pipe(sourcemaps.write('./', { sourceRoot: '/' }))
        .pipe(gulp.dest('./public/'));
};
// #endregion

// #region Style
const autoprefixer = require('gulp-autoprefixer'),
    cleanCss = require('gulp-clean-css'),
    sass = require('gulp-sass')(require('sass')),
    resolveUrl = require('gulp-resolve-url');
function css(cb) {
    return watch(['./src/**/*.css', '!./src/assets/lib/', '!./src/assets/lib/**/*'], watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        // .pipe(gulpIf(!isBuildTask, sourcemaps.init()))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer())
        .pipe(sourcemaps.write('./', { sourceRoot: '/' }))
        .pipe(gulp.dest('./public/'))
        .pipe(filter(['**', '!**/*.map']))
        .pipe(cleanCss())
        .pipe(rename({
            suffix: suffix.min
        }))
        .pipe(sourcemaps.write('./', { sourceRoot: '/' }))
        // .pipe(through2.obj(function (file, enc, cb) {
        //     console.log(file.path)
        //     cb(null, file)
        // }))
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream());
};

function scss(cb) {
    return watch(['./src/**/*.scss', '!./src/assets/lib/', '!./src/assets/lib/**/*'], watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        .pipe(dependents(dependentsConfig, { logDependents: true }))
        .pipe(plumber())
        // .pipe(gulpIf(!isBuildTask, sourcemaps.init()))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(resolveUrl({ debug: true }))
        .pipe(sourcemaps.write('./', { sourceRoot: '/' }))
        .pipe(gulp.dest('./public/'))
        .pipe(filter(['**', '!**/*.map']))
        .pipe(cleanCss())
        .pipe(rename({
            suffix: suffix.min
        }))
        .pipe(sourcemaps.write('./', { sourceRoot: '/' }))
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream());
};
// #endregion

// #region Image
const imagemin = require('gulp-imagemin');
function image(cb) {
    return watch(['./src/**/*.{png,jpg,jpeg,gif,svg}', '!./src/assets/lib/', '!./src/assets/lib/**/*'], watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        .pipe(gulpIf(isBuildTask, imagemin([
            imagemin.gifsicle({ interlaced: true }),
            imagemin.mozjpeg({ quality: 100, progressive: true }),
            imagemin.optipng({ optimizationLevel: 5 }),
            imagemin.svgo({
                plugins: [
                    { removeViewBox: false },
                    { cleanupIDs: false }
                ]
            })
        ], { verbose: true })))
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream());
};
// #endregion

// #region Plugin
function plugin(cb) {
    return watch(['./src/assets/lib/**/*'], watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        .on('change', file => browserSync.reload())
        .pipe(gulp.dest('./public/assets/lib/'));
};
// #endregion

// #region Other
function other(cb) {
    let glob = [
        './src/**/*',
        '!./src/**/*.{njk,part,tmpl,js,css,scss,png,jpg,jpeg,gif,svg}',
        '!./src/**/.git*',
        '!./src/assets/lib/',
        '!./src/assets/lib/**/*'
    ];
    return watch(glob, watchParameter)
        .on('ready', cb)
        .on('unlink', file => unlink(file))
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream());
};
// #endregion

// #region HTTP Server
function serve(cb) {
    browserSync.init({
        server: {
            baseDir: './public/'
        }
    })
    cb();
}
// #endregion

exports.default = exports.build = gulp.series(
    clean,
    gulp.parallel(
        script,
        css,
        scss,
        image,
        plugin,
        other,
        html
    ),
    serve
);
