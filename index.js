'use strict';

import { AsyncStorage } from 'react-native';

// Inspired by lscache https://github.com/pamelafox/lscache

const CACHE_PREFIX = 'cachestore-';
const CACHE_EXPIRATION_PREFIX = 'cacheexpiration-';
const EXPIRY_UNITS = 60 * 1000; // Time resolution in minutes

function currentTime(){
  return Math.floor((new Date().getTime())/EXPIRY_UNITS);
};

const CacheStore = {
  get(key){
    const theKey = CACHE_PREFIX + key;
    const exprKey = CACHE_EXPIRATION_PREFIX + key;
    return AsyncStorage.getItem(exprKey).then((expiry) => {
      if (expiry && currentTime() >= parseInt(expiry, 10)){
        AsyncStorage.multiRemove([exprKey, theKey]);
        return new Promise.reject(null);
      }
      return AsyncStorage.getItem(theKey).then((item) => {
        return Promise.resolve(JSON.parse(item));
      });
    });
  },

  set(key, value, time){
    const theKey = CACHE_PREFIX + key;
    const exprKey = CACHE_EXPIRATION_PREFIX + key;
    if (time){
      return AsyncStorage.setItem(exprKey, (currentTime() + time).toString()).then(() => {
        return AsyncStorage.setItem(theKey, JSON.stringify(value));
      });
    } else {
      AsyncStorage.removeItem(exprKey);
      return AsyncStorage.setItem(theKey, JSON.stringify(value));
    }
  },

  remove(key){
    return AsyncStorage.multiRemove([CACHE_EXPIRATION_PREFIX + key, CACHE_PREFIX + key]);
  },

  isExpired(key){
    const exprKey = CACHE_EXPIRATION_PREFIX + key;
    return AsyncStorage.getItem(exprKey).then((expiry) => {
      var expired = expiry && currentTime() >= parseInt(expiry, 10);
      return expired ? Promise.resolve() : new Promise.reject(null);
    });
  },

  flush(){
    return AsyncStorage.getAllKeys().then((keys) => {
      var theKeys = keys.filter((key) => {
        return key.indexOf(CACHE_PREFIX) == 0 || key.indexOf(CACHE_EXPIRATION_PREFIX) == 0;
      });
      return AsyncStorage.multiRemove(theKeys);
    });
  },

  async flushExpired() {
    const keys = await AsyncStorage.getAllKeys();
    var deletedValues = [];

    await Promise.all(keys.map(async key => {
      if (key.indexOf(CACHE_EXPIRATION_PREFIX) == 0) {
        var exprKey = key;
        const expiry = await AsyncStorage.getItem(exprKey);
        if (expiry && currentTime() >= parseInt(expiry, 10)) {
          var theKey = CACHE_PREFIX + key.replace(CACHE_EXPIRATION_PREFIX, "");
          deletedValues.push(await AsyncStorage.getItem(theKey));
          await AsyncStorage.multiRemove([exprKey, theKey]);
        }
      }
    }));
    return deletedValues;
  }

};




// Always flush expired items on start time
// CacheStore.flushExpired();

export default CacheStore;
