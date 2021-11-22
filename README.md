# I2P SAM

An I2P SAM library: enabling applications to communicate through the I2P network. I2P is a secure "privacy-by-design" network.

To get I2P up and running, take a look at the project: https://codeberg.org/diva.exchange/i2p

## Get Started

`npm i @diva.exchange/i2p-sam`

### How to Use Streams

Send an HTTP GET request to diva.i2p and output the response:

```
import { I2PSAMStream } from '@diva.exchange/i2p-sam';

I2PSAMStream({
  stream: {
    destination: 'diva.i2p',
    onMessage: (data: Buffer) => {
      console.log('Incoming Data: ' + data.toString());
    },
  },
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  },
}).then((i2psam) => {
  i2psam.send(Buffer.from('GET / HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
});
```

### How to Use Datagrams

Send messages from peer A to peer B:

```
import { I2PSAMRaw } from '@diva.exchange/i2p-sam';

(async () => {
  // instantiate Peer A
  const peerA = await I2PSAMRaw({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    }
  }); 
  
  // instantiate Peer B
  const peerB = await I2PSAMRaw({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    },
    listen: { 
      address: 127.0.0.1,         # udp listener
      port: 20202,                # udp listener
      onMessage: (data: Buffer) => {
        console.log('Incoming Data: ' + data.toString());
      }
    }
  }); 
  
  // send 500 messages via UDP, every 500ms
  // IMPORTANT: UDP is not reliable. Some messages might get lost.
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
})();
```

## API

### Base Class

#### lookup(name: string): Promise\<string\>

Example: 

```
import { I2PSAMRaw } from '@diva.exchange/i2p-sam';

I2PSAMRaw({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
})
  .then((sam) => 
    sam.lookup('diva.i2p')
      .then((dest) => console.log(dest))
  );
```

#### getLocalDestination(): string

Example: 

```
import { I2PSAMRaw } from '@diva.exchange/i2p-sam';

I2PSAMRaw({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((sam) => console.log(sam.getLocalDestination()));
```

#### getPublicKey(): string

Example: 

```
import { I2PSAMStream } from '@diva.exchange/i2p-sam';

I2PSAMStream({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((sam) => console.log(sam.getPublicKey()));
```

#### getPrivateKey(): string

Example: 

```
import { I2PSAMRaw } from '@diva.exchange/i2p-sam';

I2PSAMRaw({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((sam) => console.log(sam.getPrivateKey()));
```

#### getKeyPair(): { public: string, private: string }

Example: 

```
import { I2PSAMStream } from '@diva.exchange/i2p-sam';

I2PSAMStream({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((sam) => console.log(sam.getKeyPair()));
```

#### static toB32(destination: string): string

Example: 

```
import { toB32 } from '@diva.exchange/i2p-sam';

console.log(
  toB32('[some base64-encoded destination]');
);
```


### I2PSAMStream

#### send(msg: Buffer)

Example: see the _Get Started: How to Use Streams_ above. 


### I2PSAMRaw

#### send(destination: string, msg: Buffer)

Example: see _Get Started: How to Use Datagrams_ above. 

### Configuration / Options
```
type tSession = {
  id?: string;
};

type tStream = {
  destination: string;
  onMessage?: Function;
  onClose?: Function;
};

type tListen = {
  address: string;          # default 127.0.0.1
  port: number;             # default 0
  hostForward?: string;     # default [address]
  portForward?: number;     # default [port]
  onMessage?: Function;
  onClose?: Function;
};

type tSam = {
  host: string;             # default 127.0.0.1
  portTCP: number;          # default 7656
  portUDP?: number;         # default 7655
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
  onClose?: Function;
};

export type Configuration = {
  session?: tSession;
  stream?: tStream;
  listen?: tListen;
  sam?: tSam;
};
```

## How to Run Unit Tests

Assumptions: 
1. git, node and npm is available. 
2. docker and docker-compose is available. 

Clone the source code from git `git clone https://codeberg.org/diva.exchange/i2p-sam.git` and enter the folder `i2p-sam`.

Prepare the test environment by creating the docker container:

```
docker-compose -f test/sam.diva.i2p.yml up -d
```

Check whether the I2P test node is properly running by accessing the local console on: http://172.19.74.11:7070.

To modify the IP address of the local console, adapt the file `test/sam.diva.i2p.yml`.

After the docker container is running for two or three minutes (reason: the I2P network needs some minutes to integrate), execute the unit tests:

```
npm run test
```
Executing the unit tests will take a few minutes. Reason: the communication via I2P gets tested - which is the purpose of this library.

Stop the container (and purge all data within):
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

## References

I2Pd, see https://i2pd.readthedocs.io/

## License

[MIT](https://codeberg.org/diva.exchange/i2p-sam/src/branch/main/LICENSE)
