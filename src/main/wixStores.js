'use strict';

const DAL = require('./DAL');
DAL.init(require('./config').firebaseApp);
const STATIC_MEDIA_URL = 'http://static.wixstatic.com/media/';
const _ = require('lodash');
const wixStores = require('./wixStoresFacade');

function getNewProducts(instance) {
  const dalPromise = DAL.getProducts(instance).catch(()=> Error('Firebase Error'));
  const wixStoresPromise = wixStores.pollProducts(instance).catch(()=> Error('Stores API Error'));
  return Promise.all([dalPromise, wixStoresPromise])
    .then(function (data) {
      const pastProducts = data[0];
      const products = data[1].products.map(function (product) {
        return {
          product_id: product.id,
          product_name: product.name,
          product_image: _.get(product, 'media[0].url') ? STATIC_MEDIA_URL + product.media[0].url : undefined
        };
      });
      DAL.setProducts(instance, products);
      return pastProducts ? _.reject(products, product => _.some(pastProducts, 'id', product.id)) : [];
    });
}

module.exports = {
  getNewProducts
};
