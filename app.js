"use strict";

let req = require('request');
let cheerio = require('cheerio');
let Promise = require('bluebird');
let koa = require('koa');
let route = require('koa-route');
let parseBody = require('co-body');

const SEARCH_URL = 'http://www.reuters.com/finance/stocks/lookup?searchType=any&comSortBy=marketcap&sortBy=&dateRange=&search=';
const PROFILE_URL = 'http://www.reuters.com/finance/stocks/companyProfile?symbol=';

let searchesQueries = [
	// 'DBSM.SI',
	// 'OSIM',
	// 'UNITED OVERSEAS BANK LTD'
];

let reqAsync = Promise.promisify(req);

let scrapeForProfile = function(searchQuery) {
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
				return Promise.resolve([false]);
			}

			return reqAsync(PROFILE_URL + stockTickers[0]);
		})
		.spread((res, body) => {
			if (res === false) return {search: searchQuery, name: '', profile: ''};

			let $ = cheerio.load(body);
			let name = $('#sectionTitle').text().replace('Profile: ', '').trim();
			let profile = $('#companyNews .moduleBody').text().replace(/\s+» Full Overview of.*/i, '').trim();

			return {
				search: searchQuery,
				name: name,
				profile: profile
			};
		});
};

let app = koa();

app.use(function *(next) {
	try {
		yield next;
	} catch(err) {
		this.status = err.status || 500;
		this.body = {error: err.message};
		this.app.emit('error', err, this);
	}
});

app.use(route.get('/', getResults));
app.use(route.post('/', postSearches));

function *getResults(next) {
	this.body = 'HELLO WORLD!!!';
};

function *postSearches(next) {
	let body = yield parseBody.json(this);
	if (!body.searches || !(body.searches instanceof Array)) {
		this.throw(400, 'Request body should contain searches which is an array of search queries');
	}
	// this.body = body.searches;
	let profiles = yield body.searches.map(scrapeForProfile);
	this.body = profiles;
};

const PORT = process.env.PORT || 8000;
app.listen(PORT);
console.log(`Server started on ${PORT}`);
