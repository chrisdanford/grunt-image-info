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
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask("default", ["jshint", "image_info"]);

    grunt.loadTasks("tasks");
};