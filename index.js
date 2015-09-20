"use strict";

var req = require('request');
var cheerio = require('cheerio');
var Promise = require('bluebird');

var SEARCH_URL = 'http://www.reuters.com/finance/stocks/lookup?searchType=any&comSortBy=marketcap&sortBy=&dateRange=&search=';
var PROFILE_URL = 'http://www.reuters.com/finance/stocks/companyProfile?symbol=';

var searches = [
	'DBSM.SI',
	'OSIM',
	'UNITED OVERSEAS BANK LTD'
];

var reqAsync = Promise.promisify(req);

var searches = searches.map((searchQuery) => {
	let searchUrl = SEARCH_URL + searchQuery;
	// console.log(`DEBUG: requesting ${searchUrl}`);

	return reqAsync(SEARCH_URL + searchQuery)
		.spread((res, body) => {
			let $ = cheerio.load(body);
			let stockTickers = $('.search-table-data tr:nth-child(n+2) td:nth-child(2)').map(function() {
				return $(this).text();
			}).toArray();

			if (stockTickers.length > 1) {
				console.warn('Found more than 1 match for ' + searchQuery + '. ' + stockTickers.join(', '));
			} else if (stockTickers < 1) {
				console.warn('Cannot find match for ' + searchQuery);
				return false;
			}

			return reqAsync(PROFILE_URL + stockTickers[0]);
		})
		.spread((res, body) => {
			if (res === false) return false;

			let $ = cheerio.load(body);
			let name = $('#sectionTitle').text().trim();
			let profile = $('#companyNews .moduleBody').text().trim();

			return Promise.all([name, profile]);
		});
});

Promise.all(searches)
	.then((searchResults) => {
		searchResults.forEach((result) => {
			if (result === false) return;

			console.log();
			console.log(result[0].replace('Profile: ', ''));
			console.log(result[1].replace(/» Full Overview of .*/i, '').trim());
			console.log();
		});
	})
	.catch(console.error);

// req('http://www.reuters.com/finance/stocks/companyProfile?symbol=DBSM.SI', function(err, res, body) {
// 	if (err) return console.error('ERROR:', err.message);
// 	var $ = cheerio.load(body);
// 	console.log($('#companyNews .moduleBody').text().trim());
// });
