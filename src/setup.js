import fs from "fs";
import fse from "fs-extra";
import pogo from "pogo-asset-downloader";
import proto from "./proto";
import POGOProtos from "pokemongo-protobuf";

import CFG from "../cfg";

import { idToPkmnBundleName } from "./utils";

export function setup() {

  let isFirstRun = !this.directoryExists(CFG.DUMP_ASSET_PATH);

  if (isFirstRun) {
    this.print("Preparing to dump required assets..", 36);
    setTimeout(() => {
      this.onFirstRun(() => {
        this.setup();
      });
    }, 1e3);
    return void 0;
  }

  // make sure all assets got loaded properly
  this.validateAssets().then(() => {

    this.print(`Downloaded assets are valid! Proceeding..`);

    this.asset = this.parseAssetDigest();
    this.master = POGOProtos.serialize(this.parseGameMaster(), "POGOProtos.Networking.Responses.DownloadItemTemplatesResponse");

    this.setupDatabaseConnection().then(() => {
      if (CFG.PORT < 1) {
        this.print("Invalid port!", 31);
        return void 0;
      }
      this.socket = this.createHTTPServer();
      setTimeout(this::this.cycle, 1);
      let localIPv4 = this.getLocalIPv4();
      this.print(`Server running at ${localIPv4}:${CFG.PORT}`);
    });

  }).catch((e) => {
    //fse.removeSync(CFG.DUMP_ASSET_PATH);
    this.print("Error: " + e + " was not found!", 31);
  });

}

/**
 * Make sure all required
 * assets got loaded properly
 */
export function validateAssets() {

  let index = 0;
  let max = CFG.MAX_POKEMON_NATIONAL_ID;

  return new Promise((resolve, reject) => {

    if (!this.fileExists(CFG.DUMP_ASSET_PATH + "asset_digest")) {
      return reject("File asset_digest");
    }

    // validate game master
    if (!this.fileExists(CFG.DUMP_ASSET_PATH + "game_master")) {
      return reject("File game_master");
    }

    // validate models
    while (++index <= max) {
      let id = idToPkmnBundleName(index);
      if (!this.fileExists(CFG.DUMP_ASSET_PATH + id)) {
        return reject("Model " + id);
      }
    };

    resolve();

  });

}

export function parseAssetDigest() {
  let asset = null;
  try {
    let data = fs.readFileSync(CFG.DUMP_ASSET_PATH + "asset_digest");
    asset = this.parseProtobuf(data, "POGOProtos.Networking.Responses.GetAssetDigestResponse");
  } catch (e) {
    this.print(e, 31);
  }
  return (asset);
}

export function parseGameMaster() {
  let master = null;
  try {
    let data = fs.readFileSync(CFG.DUMP_ASSET_PATH + "game_master");
    master = this.parseProtobuf(data, "POGOProtos.Networking.Responses.DownloadItemTemplatesResponse");
  } catch (e) {
    this.print(e, 31);
  }
  return (master);
}

export function onFirstRun(resolve) {
  pogo.login({
    provider: CFG.DOWNLOAD_PROVIDER, // google or ptc
    username: CFG.DOWNLOAD_USERNAME,
    password: CFG.DOWNLOAD_PASSWORD
  }).then((res) => {
    // create data dir, if login successed
    fse.ensureDirSync(CFG.DUMP_ASSET_PATH);
    // write game master
    fs.writeFileSync(CFG.DUMP_ASSET_PATH + "game_master", res.master.toBuffer());
    // get and write asset digests
    this.dumpAssetDigests(res.client).then(() => {
      // dump pkmn models
      this.dumpPkmnModels(() => {
        resolve();
      });
    });
  }).catch((e) => {
    this.print(e, 31);
  });
}

export function dumpAssetDigests(client) {

  this.print(`Dumping asset digests..`, 35);

  let platforms = [
    {
      name: "android",
      platform: 2,
      manufacturer: "LGE",
      model: "Nexus 5",
      locale: "",
      version: 3300
    }
  ];

  return new Promise((resolve, reject) => {
    let ii = 0;
    let index = 0;
    for (; ii < platforms.length; ++ii) {
      let key = platforms[ii];
      client.getAssetDigest(
        key.platform,
        key.manufacturer,
        key.model,
        key.locale,
        key.version
      ).then((asset) => {
        this.print(`Dumping ${key.name} asset digest..`, 35);
        fs.writeFileSync(CFG.DUMP_ASSET_PATH + "asset_digest", asset.toBuffer());
        if (++index >= platforms.length) {
          resolve();
        }
      });
    };
  });

}

export function dumpPkmnModels(resolve) {

  let limit = CFG.MAX_POKEMON_NATIONAL_ID;

  const dump = (index) => {
    let ids = [];
    if (++index <= limit) ids.push(index);
    if (++index <= limit) ids.push(index);
    if (++index <= limit) ids.push(index);
    pogo.getAssetByPokemonId(ids).then((downloads) => {
      downloads.map((item) => {
        this.print(`Dumping model ${item.name}..`, 35);
        try {
          fs.writeFileSync(CFG.DUMP_ASSET_PATH + item.name, item.body);
        }
        catch (e) {
          this.print(`Error while dumping model ${item.name}:` + e, 31);
        }
      });
      if (index >= limit) {
        this.print(`Dumped ${limit} assets successfully!`);
        resolve();
        return void 0;
      }
      setTimeout(() => dump(index), 2e3);
    });
  };

  dump(0);

}