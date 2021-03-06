// MODULES ====================================
// Mongoose ORM for MongoDB
var mongoose = require('mongoose');
// Created schema
var Query = require('./query');

// Static country data
var alerts = require('./TravelAlerts.json');

// To automate travel warning updates
var express = require('express');
var request = require('request');
// required for automating travel warning updates
var CronJob = require('cron').CronJob;

// To write in the travel warnings
var fs = require('node-fs');

// CONNECT TO DB ====================================
mongoURI = process.env.MONGOLAB_URI || 'mongodb://localhost/whocaresdb';

mongoose.connect(mongoURI);

var db = mongoose.connection;
db.on('error', console.error.bind('connection error: '));

// LOAD TRAVEL WARNINGS ====================================
db.clearAlerts = function () {
  Query.Country.find().remove().exec();
};

db.loadAlerts = function () {
  request('http://data.international.gc.ca/travel-voyage/index-alpha-eng.json?_ga=1.120271435.2111222910.1447962394', function (error, response, body) {
     if (!error && response.statusCode === 200) {
      fs.writeFile('db/TravelAlerts.json', response.body, function (err) {
        if (err) throw err;
        console.log('Alerts saved to file');
      });
     }
  });
  for (var key in alerts.data) {
    var entry = {
      name: alerts.data[key].eng.name,
      advisoryState: alerts.data[key]["advisory-state"],
      hasAdvisory: alerts.data[key]["has-advisory-warning"],
      advisoryText: alerts.data[key]["eng"]["advisory-text"]
    };
    var newEntry = new Query.Country(entry);
    newEntry.save();
  }
};

// UPDATE WARNINGS ONCE A WEEK ==============================
var mountie = new CronJob('29 13 * * wed', function(){
    db.clearAlerts();
    db.loadAlerts();
  }, function () {
    console.log('Cron stopped!');
  },
  true,
  timeZone = 'America/Los_Angeles'
);

db.once('open', function() {
  console.log('Mongodb connection open');
});

module.exports = db;
