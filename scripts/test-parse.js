const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('test-output-zh-Hans.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text.substring(0, 1000));
}).catch(console.error);
