var json2css = require('json2css'),
    fs = require('fs'),
    path = require('path'),
    gm = require('gm'),
    async = require('async');

function ExtFormat() {
    this.formatObj = {};
}
ExtFormat.prototype = {
    'add': function (name, val) {
        this.formatObj[name] = val;
    },
    'get': function (filepath) {
        // Grab the extension from the filepath
        var ext = path.extname(filepath),
                lowerExt = ext.toLowerCase();

        // Look up the file extenion from our format object
        var formatObj = this.formatObj,
                format = formatObj[lowerExt];
        return format;
    }
};

// Create img and css formats
var cssFormats = new ExtFormat();

// Add our css formats
cssFormats.add('.styl', 'stylus');
cssFormats.add('.stylus', 'stylus');
cssFormats.add('.sass', 'sass');
cssFormats.add('.scss', 'scss');
cssFormats.add('.less', 'less');
cssFormats.add('.json', 'json');
cssFormats.add('.css', 'css');

module.exports = function (grunt) {
    // Create a SpriteMaker function
    var imageInfoTask = function() {
        var options = this.options({
                mapSrcToName: function(src) {
                    var fullname = path.basename(src);
                    var nameParts = fullname.split('.');

                    // If there is are more than 2 parts, pop the last one
                    if (nameParts.length >= 2) {
                        nameParts.pop();
                    }
                    return nameParts.join('.');
                },
                mapSrcToUrl: function(src) {
                    return src;
                }
            }),
            srcFiles = this.filesSrc,
            cssTemplate = options.cssTemplate,
            cssVarMap = options.cssVarMap || function noop () {},
            that = this;

        var imageSizeCache = {};
        var newImageSizeCache = {};
        var cacheFile = options.cacheFile;
        var isReadOnlyCache = !!options.readOnlyCache;

        if (cacheFile) {
            try {
               imageSizeCache = JSON.parse(fs.readFileSync(cacheFile));
            } catch (e) {
            }
        }
        var gmInstance = options.imageMagick ? gm.subClass({ imageMagick: true }) : gm;

        /**
         * Retrieves size data from a file from either graphicsmagick or the cache
         * @param  {String}   filename
         * @param  {Function} callback
         */
        var getSizeData = function (filename, callback) {
            var relFilename = path.relative(__dirname, filename);
            var cachedMTime = String(imageSizeCache[relFilename] && imageSizeCache[relFilename].mtime);
            var newMTime = String(cacheFile ? fs.statSync(filename).mtime : "");

            if (cachedMTime === newMTime) {
                newImageSizeCache[relFilename] = imageSizeCache[relFilename];
                callback(null, imageSizeCache[relFilename].data);
                return;
            }

            gmInstance(filename).size(function (err, data) {
                if (err) return callback(err);
                newImageSizeCache[relFilename] = {
                    mtime: newMTime,
                    data: data
                };
                callback(err, data);
            });
        };

        // Verify all properties are here
        if (this.files.length === 0) {
            return grunt.fatal("this task requires 'files'");
        }

        // Create an async callback
        var done = this.async();

        var processFile = function(file, callback) {
            if (!file.dest || file.src.length === 0) {
                callback("missing 'dest' or 'src'");
                return;
            }

            var cleanCoords = [];
            var processSrc = function(src, callback) {
                // obtain the size of an image
                getSizeData(src, function(err, size) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    var coords = {
                        name: options.mapSrcToName(src),
                        image: options.mapSrcToUrl(src),
                        x: 0,
                        y: 0,
                        offset_x: 0,
                        offset_y: 0,
                        width: size.width,
                        height: size.height,
                        total_width: size.width,
                        total_height: size.height,
                    };

                    cleanCoords.push(coords);

                    callback();
                });
            };

            // Hitting spawn EMFILE without this.
            var maxGmConcurrency = 10;

            async.eachLimit(file.src, maxGmConcurrency, processSrc, function(err) {
                if (err) {
                    callback(err);
                }

                var cssFormat = 'spritesmith-custom';
                var cssOptions = options.cssOpts || {};

                // If there's a custom template, use it
                if (cssTemplate) {
                    json2css.addMustacheTemplate(cssFormat, fs.readFileSync(cssTemplate, 'utf8'));
                } else {
                    // Otherwise, override the cssFormat and fallback to 'json'
                    cssFormat = options.cssFormat || cssFormats.get(file.dest) || 'json';
                }

                cleanCoords[cleanCoords.length - 1].last = true;

                // Render the variables via json2css
                var cssStr = json2css(cleanCoords, {'format': cssFormat, 'formatOpts': cssOptions});

                // Write it out to the CSS file
                var destCSSDir = path.dirname(file.dest);
                grunt.file.mkdir(destCSSDir);
                fs.writeFileSync(file.dest, cssStr, 'utf8');

                // Fail task if errors were logged.
                if (that.errorCount) { callback('error count ' + that.errorCount); }

                grunt.verbose.writeln('File "' + file.dest + '" created.');
                callback();
            });
        };

        async.each(this.files, processFile, function(err) {
            if (err) {
                grunt.fatal(err);
                done(false);
            }

            if (cacheFile && !isReadOnlyCache) {
                try {
                    fs.writeFileSync(cacheFile, JSON.stringify(newImageSizeCache));
                } catch (e) {
                    grunt.log.warn('Unable to write cache file: ' + cacheFile);
                }
            }

            done(true);
        });
    };

    // Export the SpriteMaker function
    grunt.registerMultiTask('image_info', 'Generate image info', imageInfoTask);
};
