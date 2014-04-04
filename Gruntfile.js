module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            all: ["Gruntfile.js", "tasks/*.js"],
        },
        image_info: {
            testJson: {
                files: {
                    'test-result.json': ['test/images/*.png'],
                }
            },
            testScss: {
                files: {
                    'test-result.scss': ['test/images/*.png'],
                }
            },
        },
        exec: {
            publish: {
                command: 'npm publish .',
            }
        },
        bump: {
            options: {
                push: false,
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-exec');

    grunt.registerTask("default", ["jshint", "image_info"]);

    grunt.loadTasks("tasks");
};