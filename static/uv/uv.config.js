
//uv config
//has some neat features
let storedBare = null;


const defaultBareServer = '/edu/';
let effectiveBare = defaultBareServer;

if (typeof localStorage !== 'undefined') {
  storedBare = localStorage.getItem('bare');
  if (storedBare) {
    effectiveBare = storedBare;
  } else {
    localStorage.setItem('bare', defaultBareServer);
    effectiveBare = defaultBareServer;
  }
}

self.__uv$config = {
  prefix: '/service/',
  bare: effectiveBare,
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/uv/uv.handler.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js',
};

