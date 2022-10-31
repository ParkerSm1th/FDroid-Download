#!/usr/bin/env node
"use strict";
const rp = require("request-promise");
const cheerio = require("cheerio");
const { exec } = require("child_process");
const chalk = require("chalk");
const express = require("express");
const cloudflareScraper = require("cloudflare-scraper");
const app = express();
const port = 3000;
var pjson = require("./package.json");
const fs = require("fs");
const apkData = require("./functions/apkData.js");

var ArgumentParser = require("argparse").ArgumentParser;
var parser = new ArgumentParser({
  version: "1.0",
  addHelp: true,
  description: "F-Droid Scraper",
});
parser.addArgument(["-path", "--path"], {
  help: "Path for outputs to go to, do NOT include trailing slash ex: /home/user/Downloads",
  required: true,
});
parser.addArgument(["-s", "--search"], {
  help: "Search term",
  required: true,
});
parser.addArgument(["-w", "--website"], {
  help: "Website to search for. Available: (fdroid)",
  required: true,
});
var args = parser.parseArgs();

console.log("💡 STARTING UP " + pjson.name + " v" + pjson.version + " 💡");

/* Functions */
const getDownloadFromLink = (link, site) => {
  let ogPackage;
  let jsonParsed;
  let downloadLink;
  switch (site) {
    case "fdroid":
      ogPackage = link.split("https://f-droid.org/en/packages/")[1];
      rp("https://f-droid.org/api/v1/packages/" + ogPackage).then(function (
        apiHTML
      ) {
        jsonParsed = JSON.parse(apiHTML);
        downloadLink =
          "https://f-droid.org/repo/" +
          jsonParsed.packageName +
          "_" +
          jsonParsed.suggestedVersionCode +
          ".apk";
        console.log("📥 Downloading " + jsonParsed.packageName);
        if (
          fs.existsSync(
            args.path +
              "/" +
              jsonParsed.packageName +
              "_" +
              jsonParsed.suggestedVersionCode +
              ".apk"
          )
        ) {
          console.log(
            "🗃️  Cancelling download, already exists: " + jsonParsed.packageName
          );
          return;
        }
        exec(
          "cd " + args.path + " && wget " + downloadLink,
          (error, stdout, stderr) => {
            if (error) {
              console.log("❌ Error downloading " + jsonParsed.packageName);
              return;
            }
            if (stderr) {
              if (
                fs.existsSync(
                  args.path +
                    "/" +
                    jsonParsed.packageName +
                    "_" +
                    jsonParsed.suggestedVersionCode +
                    ".apk"
                )
              ) {
                console.log("✅ Downloaded " + jsonParsed.packageName);
              }
              return;
            }
          }
        );
      });
      break;
    case "apkmirror":
      console.log(link);
      if (true) return;
      ogPackage = link.split("https://f-droid.org/en/packages/")[1];
      rp("https://f-droid.org/api/v1/packages/" + ogPackage).then(function (
        apiHTML
      ) {
        jsonParsed = JSON.parse(apiHTML);
        downloadLink =
          "https://f-droid.org/repo/" +
          jsonParsed.packageName +
          "_" +
          jsonParsed.suggestedVersionCode +
          ".apk";
        console.log("📥 Downloading " + jsonParsed.packageName);
        if (
          fs.existsSync(
            args.path +
              "/" +
              jsonParsed.packageName +
              "_" +
              jsonParsed.suggestedVersionCode +
              ".apk"
          )
        ) {
          console.log(
            "🗃️  Cancelling download, already exists: " + jsonParsed.packageName
          );
          return;
        }
        exec(
          "cd " + args.path + " && wget " + downloadLink,
          (error, stdout, stderr) => {
            if (error) {
              console.log("❌ Error downloading " + jsonParsed.packageName);
              return;
            }
            if (stderr) {
              if (
                fs.existsSync(
                  args.path +
                    "/" +
                    jsonParsed.packageName +
                    "_" +
                    jsonParsed.suggestedVersionCode +
                    ".apk"
                )
              ) {
                console.log("✅ Downloaded " + jsonParsed.packageName);
              }
              return;
            }
          }
        );
      });
      break;
    default:
      console.log("🛑 Invalid site! Please try: fdroid or apkmirror");
  }
};

const getAPKsFromTerm = (term, site) => {
  let keepLooping;
  let downloaded;
  let url;
  let $;
  switch (site) {
    case "fdroid":
      keepLooping = true;
      downloaded = [];
      for (let i = 1; i < 5; i++) {
        if (!keepLooping) return;
        url = `https://search.f-droid.org/?q=${term}&lang=en&page=${i}`;
        rp(url)
          .then(function (html) {
            //success!
            $ = cheerio.load(html);
            for (let pack in $("a.package-header", html)) {
              if ($("a.package-header", html)[pack].attribs == undefined)
                return;
              if (
                downloaded.includes(
                  $("a.package-header", html)[pack].attribs.href
                )
              )
                return;
              downloaded.push($("a.package-header", html)[pack].attribs.href);
              getDownloadFromLink(
                $("a.package-header", html)[pack].attribs.href,
                site
              );
            }
          })
          .catch(function (err) {
            console.log(err);
            keepLooping = false;
          });
      }
      break;
    case "apkmirror":
      keepLooping = true;
      downloaded = [];
      for (let i = 1; i < 150; i++) {
        if (!keepLooping) return;
        url = `https://www.apkmirror.com/?post_type=app_release&searchtype=apk&page=${i}&s=${term}`;
        cloudflareScraper
          .get(url)
          .then(function (html) {
            //success!
            $ = cheerio.load(html);
            for (let pack in $(".appRowTitle a", html)) {
              if ($(".appRowTitle a", html)[pack].attribs == undefined) return;
              if (
                downloaded.includes(
                  $(".appRowTitle a", html)[pack].attribs.href
                )
              )
                return;
              downloaded.push($(".appRowTitle a", html)[pack].attribs.href);
              getDownloadFromLink(
                $(".appRowTitle a", html)[pack].attribs.href,
                site
              );
            }
          })
          .catch(function (err) {
            console.log("🛑 Cloudflare Blocked Request on: " + url);
            if (err.length < 1000) keepLooping = false;
          });
      }
      break;
    default:
      console.log("🛑 Invalid site! Please try: fdroid or apkmirror");
      break;
  }
};

switch (args.website.toLowerCase()) {
  case "fdroid":
    console.log("👾 Going to use " + chalk.bold("FDroid"));
    console.log(
      "🔎 Going to try to download APK's related to: " + args.search + "..."
    );
    getAPKsFromTerm(args.search, args.website.toLowerCase());
    break;
  /*case "apkmirror":
    console.log("👾 Going to use " + chalk.bold("APKMirror"));
    console.log(
      "🔎 Going to try to download APK's related to: " + args.search + "..."
    );
    getAPKsFromTerm(args.search, args.website.toLowerCase());
    break;*/
  default:
    console.log("🛑 Invalid site! Please try: fdroid");
}
