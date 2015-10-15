'use strict';

const DAL = require('./DAL');
DAL.init(require('./config').firebaseApp);
const STATIC_MEDIA_URL = 'http://static.wixstatic.com/media/';
const _ = require('lodash');
const wixStores = require('./wixStoresFacade');

function getProductInfo(product) {
  return {
    meta: {id: product.id, timestamp: Date.now()},
    product_name: product.name,
    product_image: _.get(product, 'media[0].url') ? STATIC_MEDIA_URL + product.media[0].url : undefined
  };
}

function getNewProducts(productsData, currProducts) {
  const newProductData = _.reject(productsData, function (product) {
    return _.some(currProducts, (currProd) => currProd.meta.id === product.id);
  });
  return newProductData.map(getProductInfo);
}

function getProductsSince(products, since) {
  return products.filter(product => product.meta.timestamp > since);
}

function getProducts(instanceId) {
  return Promise.all([DAL.getStoreMetaData(instanceId), wixStores.pollProducts(instanceId)])
    .then(function (data) {
      const storeMetaData = data[0];
      const productsData = data[1].products;

      if (_.isUndefined(storeMetaData)) {
        const storeId = DAL.getNextStoreId();
        DAL.setProducts(storeId, productsData.map(getProductInfo));
        DAL.setStore(storeId, instanceId);
        return [];
      }
      return DAL.getProducts(storeMetaData.storeId)
        .then(function (currProducts) {
          const newProducts = getNewProducts(productsData, currProducts);
          const allProducts = currProducts.concat(newProducts);
          DAL.setProducts(storeMetaData.storeId, allProducts);
          return getProductsSince(allProducts, storeMetaData.timestamp);
        });
    });
}

module.exports = {
  getProducts
};
