// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// sourceExts가 이미 정의되어 있으면 병합, 아니면 기본값 사용
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs'];

module.exports = config;
