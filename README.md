# I2P SAM

An I2P SAM library: enabling applications to communicate through the I2P network. I2P is a "privacy-by-design" network.

## Quick Start

### Using Datagrams (UDP)

```
const raw = await I2PSAMRaw({
  sam: {
    host: 127.0.0.1,   # your local I2P SAM host
    port: 7656         # your local I2P SAM port
  },
  listen: { 
    onMessage: (data: Buffer) => {
      console.log(data.toString());
    }
  }
}); 
raw.send('diva.i2p', 'Hello DIVA');
```

### Using Streams (TCP)
@TODO

### API

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

## License

[MIT](LICENSE)
