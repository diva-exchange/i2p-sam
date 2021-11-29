# I2P SAM

An I2P SAM library: enabling applications to communicate through the I2P network. I2P is a "privacy-by-design" network.

To get I2P up and running, take a look at the project: https://codeberg.org/diva.exchange/i2p

## Get Started

`npm i @diva.exchange/i2p-sam`

### How to Use Streams

Send an HTTP GET request to diva.i2p and output the response:

```
import { createStream } from '@diva.exchange/i2p-sam';

createStream({
  stream: {
    destination: 'diva.i2p',
    onData: (data: Buffer) => {
      console.log('Incoming Data: ' + data.toString());
    },
  },
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  },
}).then((sam) => {
  sam.send(Buffer.from('GET / HTTP/1.1\r\nHost: diva.i2p\r\n\r\n'));
});
```

Forward incoming streaming data to a local socket server:

```
import { createStream, createForward, I2pSamStream } from '@diva.exchange/i2p-sam';
import net from 'net';

(async () => {
  const serverForward = net.createServer((c) => {
    console.debug('client connected');
    c.on('end', () => {
      console.debug('client disconnected');
    });
    c.on('data', (data: Buffer) => {
      console.debug(data.toString());
      c.write(`Hello Client!\n`);
    });
  });
  serverForward.listen(20222, '127.0.0.1');

  const samForward: I2pSamStream = await createForward({
    sam: { 
      host: 127.0.0.1,        # your local I2P SAM host
      portTCP: 7656           # your local I2P SAM port
    },
    forward: {
      host: '127.0.0.1',      # your local listener, see above
      port: 20222,            # your local listener, see above
    },
  });

  const samClient: I2pSamStream = await createStream({
    sam: { 
      host: 127.0.0.1,          # your local I2P SAM host
      portTCP: 7656             # your local I2P SAM port
    },
    stream: {
      destination: samForward.getPublicKey(),
      onData: (data: Buffer) => {
        console.debug(data.toString());
      },
    },
  });

  // send some data to destination
  samClient.stream(Buffer.from(`Hi Server!\n`));
})();
```

### How to Use Repliable Datagrams

Send messages from peer A to peer B:

```
import { createDatagram, toB32 } from '@diva.exchange/i2p-sam';

(async () => {
  // instantiate Peer A
  const peerA = await createDatagram({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    }
  }); 
  
  // instantiate Peer B
  const peerB = await createDatagram({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    },
    listen: { 
      address: 127.0.0.1,         # udp listener
      port: 20202,                # udp listener
      onData: (data: Buffer, fromDestination) => {
        console.debug(`Incoming Data from ${toB32(fromDestination)}: ${data.toString()}`);
      }
    }
  }); 
  
  // send 100 messages via UDP, every 500ms a message
  // IMPORTANT: UDP is not reliable. Some messages might get lost.
  const msg: string = 'Hello World';
  await new Promise((resolve) => {
    let t = 0;
    const i = setInterval(async () => {
      await peerA.send(peerB.getPublicKey(), Buffer.from(`${t} ${msg}`);
      if (t++ >= 100) {
        clearInterval(i);
        resolve(true);
      }
    }, 500);
  });
})();
```

### How to Use Raw Datagrams

Send messages from peer A to peer B:

```
import { createRaw } from '@diva.exchange/i2p-sam';

(async () => {
  // instantiate Peer A
  const peerA = await createRaw({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    }
  }); 
  
  // instantiate Peer B
  const peerB = await createRaw({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    },
    listen: { 
      address: 127.0.0.1,         # udp listener
      port: 20202,                # udp listener
      onData: (data: Buffer) => {
        console.log('Incoming Data: ' + data.toString());
      }
    }
  }); 
  
  // send 100 messages via UDP, every 500ms a message
  // IMPORTANT: UDP is not reliable. Some messages might get lost.
  const msg: string = 'Hello Peer B - I am Peer A';
  await new Promise((resolve) => {
    let t = 0;
    const i = setInterval(async () => {
      await peerA.send(peerB.getPublicKey(), Buffer.from(`${t} ${msg}`);
      if (t++ >= 100) {
        clearInterval(i);
        resolve(true);
      }
    }, 500);
  });
})();
```

## API

### getPublicKey(): string

Get the public key of the local destination.

Example: 

```
import { createDatagram } from '@diva.exchange/i2p-sam';

createDatagram({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((sam) => console.log(sam.getPublicKey()));
```

### getPrivateKey(): string

Get the private key of the local destination.

Example: 

```
import { createDatagram } from '@diva.exchange/i2p-sam';

createDatagram({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((sam) => console.log(sam.getPrivateKey()));
```

### getKeyPair(): { public: string, private: string }

Get the public and private key of the local destination.

Example: 

```
import { createStream } from '@diva.exchange/i2p-sam';

createStream({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  },
  stream: {
    destination: 'diva.i2p'
  },
}).then((sam) => console.log(sam.getKeyPair()));
```

### close()

Close a SAM connection.

Example: 

```
import { createRaw } from '@diva.exchange/i2p-sam';

(async () => {
  const sam = await createRaw({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    }
  });
  
  sam.close();
})();
```

### toB32(destination: string): string

Convert a destination to a b32 address (without any extensions - just a Base32 string).

Example: 

```
import { toB32 } from '@diva.exchange/i2p-sam';

console.log(
  toB32('[some base64-encoded destination]');
);
```

### createLocalDestination(c: Configuration): Promise\<{ address: string, public: string, private: string }\>

Create a new local destination and return its properties.

Example: 

```
import { createLocalDestination } from '@diva.exchange/i2p-sam';

createLocalDestination({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}).then((obj) => console.log(obj));
```


### lookup(c: Configuration, name: string): Promise\<string\>

Lookup (aka resolve) an I2P address (like diva.i2p or also a .b32.i2p address) to a destination. The destination, which is the public key, is a base64 encoded string.

Example: 

```
import { lookup } from '@diva.exchange/i2p-sam';

lookup({
  sam: {
    host: 127.0.0.1,            # your local I2P SAM host
    portTCP: 7656               # your local I2P SAM port
  }
}, 'diva.i2p').then((dest) => console.log(dest));
```

### stream(msg: Buffer)

Example: see the _Get Started: How to Use Streams_ above. 


### send(destination: string, msg: Buffer)

Example: see _Get Started: How to Use Datagrams_ above. 

### Configuration / Options
```
type tSession = {
  id?: string;
};

type tStream = {
  destination: string;
  onData?: Function;
};

type tForward = {
  host: string;
  port: number;
};

type tListen = {
  address: string;
  port: number;
  hostForward?: string;
  portForward?: number;
  onData?: Function;
};

type tSam = {
  host: string;
  portTCP: number;
  portUDP?: number;
  versionMin?: string;
  versionMax?: string;
  publicKey?: string;
  privateKey?: string;
};

export type Configuration = {
  session?: tSession;
  stream?: tStream;
  forward?: tForward;
  listen?: tListen;
  sam?: tSam;
};

type ConfigurationDefault = {
  session: tSession;
  stream: tStream;
  forward: tForward;
  listen: tListen;
  sam: tSam;
};

const DEFAULT_CONFIGURATION: ConfigurationDefault = {
  session: {
    id: '',
  },
  stream: {
    destination: '',
  },
  forward: {
    host: '',
    port: 0,
  },
  listen: {
    address: '127.0.0.1',
    port: 0,
    hostForward: '',
    portForward: 0,
  },
  sam: {
    host: '127.0.0.1',
    portTCP: 7656,
    portUDP: 7655,
    versionMin: '',
    versionMax: '',
    publicKey: '',
    privateKey: '',
  },
};
```

### Events

#### error
Generic Error event - emitted if sockets report errors.

```
import { createRaw } from '@diva.exchange/i2p-sam';

(async () => {
  const sam = await createRaw({
    sam: {
      host: 127.0.0.1,            # your local I2P SAM host
      portTCP: 7656               # your local I2P SAM port
    }
  });
  sam.on('error', (error) => console.debug(error));
})();
```


#### control-close
Emitted if the SAM control socket got closed.  

#### stream-close
Emitted if the stream socket got closed.  


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

SAM docs: https://geti2p.net/en/docs/api/samv3

I2Pd: https://i2pd.readthedocs.io/

## License

[MIT](https://codeberg.org/diva.exchange/i2p-sam/src/branch/main/LICENSE)
