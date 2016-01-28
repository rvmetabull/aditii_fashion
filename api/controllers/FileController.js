/**
 * FileController
 *
 * @description :: Server-side logic for managing files
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var parseXlsx = require('excel');
module.exports = {
  upload: function (req, res) {
    if (req.method === 'GET') {
      return res.json({'status': 'GET not allowed'});
    }

    var file = req.file('uploadFile');

    file.upload({dirname: '../../assets/'}, function (err, files) {
      if (err)
        return res.serverError(err);

      var fileObj = files[0].fd;
      parseXlsx(fileObj, function (err, data) {
        if (err) {
          console.log(err);
        } else {
          // data is an array of arrays
          var headersRaw = data[0];
          var headers = [];
          //Remove blank columns
          for (var i = 0; i < headersRaw.length; i++) {
            var str = headersRaw[i];
            if (!((str || '').match(/^\s*$/))) {
              headers.push(str);
            }
          }
          console.log(headers);
        }
      });

      return res.json({
        message: files.length + ' file(s) uploaded successfully!',
        files: files
      });
    });
  }
};

