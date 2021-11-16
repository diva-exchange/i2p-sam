# I2P SAM

An I2P SAM library: enabling applications to communicate through the I2P network. I2P is a "privacy-by-design" network.

To get I2P quickly up and running please take a look at this project: https://codeberg.org/diva.exchange/i2p

## Quick Start

### How to Use Datagrams (UDP)

Send messages from peer A to peer B:

```
// instantiate Peer A
const peerA = await I2PSAMRaw({
  sam: {
    host: 127.0.0.1,     # your local I2P SAM host
    port: 7656           # your local I2P SAM port
  }
}); 

// instantiate Peer B
const peerB = await I2PSAMRaw({
  sam: {
    host: 127.0.0.1,     # your local I2P SAM host
    port: 7656           # your local I2P SAM port
  },
  listen: { 
    address: 127.0.0.1,  # udp listener
    port: 20202,         # udp listener
    onMessage: (data: Buffer) => {
      console.log('Incoming Data: ' + data.toString());
    }
  }
}); 

// send 500 messages via UDP, every 500ms
// IMPORTANT: UDP is by design not reliable. Some messages might get lost.
const msg: string = 'Hello Peer B - I am Peer A';
await new Promise((resolve) => {
  let t = 0;
  const i = setInterval(async () => {
    await peerA.send(peerB.getPublicKey(), Buffer.from(`${t} ${msg}`);
    if (t++ >= 500) {
      clearInterval(i);
      resolve(true);
    }
  }, 500);
});
```

### Using Streams (TCP)
@TODO

## API

### lookup(name: string): Promise\<string\>

### getPublicKey(): string

### getPrivateKey(): string

### getKeyPair(): { public: string, private: string }

### send(destination: string, msg: Buffer): Promise\<void\>


### Configuration / Options
```
type tSession = {
  id?: string;
};

type tListen = {
  address?: string;
  port?: number;
  hostForward?: string;
  portForward?: number;
  onMessage?: Function;
  onError?: Function;
  onClose?: Function;
};

type tSam = {
  hostControl: string;
  portControlTCP: number;
  portControlUDP: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
  onError?: Function;
  onClose?: Function;
};

export type Configuration = {
  session?: tSession;
  listen?: tListen;
  sam: tSam;
};
```

#### lookup(destination: string)
@TODO

#### send(msg: Buffer)
@TODO

## How to Run Unit Tests

Prepare the test environment by creating three docker container:

```
docker-compose -f test/sam.diva.i2p.yml up -d
```

Check wether the I2P test nodes are properly running by accessing the local consoles running on: http://172.19.74.11:7070, http://172.19.74.12:7070 or http://172.19.74.13:7070

To modify the IP addresses of the local consoles, adapt the file `test/sam.diva.i2p.yml`.

After the docker containers are running for two or three minutes (reason: the I2P network needs some minutes to build), execute the unit tests:

```
npm run test
```

Stop all container (and purge all data within):
```
docker-compose -f test/sam.diva.i2p.yml down --volumes
```
 

## Linting

To lint the code, use
```
npm run lint
```


## Contact the Developers

On [DIVA.EXCHANGE](https://www.diva.exchange) you'll find various options to get in touch with the team.

Talk to us via Telegram [https://t.me/diva_exchange_chat_de]() (English or German).

## Donations

Your donation goes entirely to the project. Your donation makes the development of DIVA.EXCHANGE faster.

XMR: 42QLvHvkc9bahHadQfEzuJJx4ZHnGhQzBXa8C9H3c472diEvVRzevwpN7VAUpCPePCiDhehH4BAWh8kYicoSxpusMmhfwgx

BTC: 3Ebuzhsbs6DrUQuwvMu722LhD8cNfhG1gs

Awesome, thank you!

##References

I2Pd, see https://i2pd.readthedocs.io/

## License

[MIT](LICENSE)
