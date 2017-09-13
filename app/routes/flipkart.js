var request = require('request'); // for creating http requests
var cheerio = require('cheerio'); // for web scrapping
var fs = require('fs'); // for the file system
var moment = require('moment');
var Product = require('../models/product');

module.exports = function(app) {

    // api to scrape flipkart products
    app.post('/flipkart', function(req, res) {
        var url = req.body.url;
        request(url, function(error, response, body) {
            if (!error) {
                var $ = cheerio.load(body);
                var json = {
                    title: "",
                    current_price: "",
                    mrp: "",
                    current_time: "",
                    price_history_file: ""
                };

                json.title = $("[class='_3eAQiD']").text();
                json.current_price = $("[class='_1vC4OE _37U4_g']").text().replace('₹', '');
                json.mrp = $("[class='_3auQ3N _16fZeb']").text().replace('₹', '');
                var price_history_file = json.title.replace(/[^a-zA-Z0-9]/g, '');
                json.price_history_file = price_history_file;
                var current_time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                json.current_time = current_time;

                res.json(json);


                //write product details to database
                //check if product already exists
                Product.findOne({ 'price_history_file' : price_history_file }, function(err, product) {
                  if (err)
                    console.log(err);
                  //if product already exists in db
                  if (product) {
                    data = {
                      time: json.current_time,
                      price: json.current_price
                    }
                    // writing the changes to the file and this file will then be processed in mail.js
                    fs.appendFile("app/data/"+price_history_file+".json", JSON.stringify(data, null, 4), function() {
                        console.log('Details successfully appended to file %s.json',price_history_file);
                    });

                    // replace current price with latest price
                    product.current_time = json.current_time;
                    product.current_price = json.current_price;
                    product.save(function(err) {
                        if (err)
                            throw err;
                        else{
                          console.log('Details saved to database');
                        }
                    });
                  } else {
                    var newProduct = new Product();
                    newProduct.title = json.title;
                    newProduct.current_price = json.current_price;
                    newProduct.mrp = json.mrp;
                    newProduct.price_history_file = json.price_history_file;
                    newProduct.current_time = json.current_time;

                    // writing the changes to the file and this file will then be processed in mail.js
                    fs.appendFile("app/data/"+price_history_file+".json", JSON.stringify(json, null, 4), function() {
                        console.log('Details successfully written to file %s.json',price_history_file);
                    });
                    newProduct.save(function(err) {
                        if (err)
                            throw err;
                        else{
                          console.log('Details saved to database');
                        }
                    });
                  }
                });
            }
        });
    });
}
