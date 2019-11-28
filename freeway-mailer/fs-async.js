/**
 * Simple implementation of promise bases file system functions.
 */

const fs = require("fs");

/**
 * This functions returns an array of file names that are in
 * a directory.
 * 
 * @param {string} path Path to the directory 
 * @returns {Promise} That resolves to an array of file names
 */
function readDir(path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            if (err) return reject(err);
            return resolve(files);
        });
    });
}

/**
 * This function returns the contents of a file.
 * By default a buffer is returned. Use .toString() or specify an
 * encoding to receive a string.
 * 
 * @param {string} path Path to the file
 * @param {object} options Options like encoding for reading the file.
 * @returns {Promise} File contents in the format specified in the options object.
 */
function readFile(path, options) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, options, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

module.exports = {
    readDir,
    readFile
};