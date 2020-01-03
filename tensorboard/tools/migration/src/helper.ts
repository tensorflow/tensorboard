import * as ts from 'typescript';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  renameSync,
} from 'fs';
import {resolve, dirname, basename, parse, format} from 'path';
const chalk = require('chalk');
const mkdirp = require('mkdirp');

export const TS_LICENSE = `/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
`;

export function getPreamble(content: string) {
  const range = ts.getLeadingCommentRanges(content, 0);
  const preamble = range
    ? range.map(({pos, end}) => content.slice(pos, end)).join('\n')
    : TS_LICENSE;
  return preamble + '\n';
}

function centerText(text: string, character = '=', fillAll = false): string {
  const prettyText = text.length ? ' ' + text + ' ' : '';
  const padding = (process.stdout.columns || 40) - prettyText.length;
  if (padding <= 0) {
    return text;
  }

  const leftPad = Math.floor(padding / 2);
  const rightPad = Math.ceil(padding / 2);

  if (fillAll) {
    const left = Array(leftPad)
      .fill(character)
      .join('');
    const right = Array(rightPad)
      .fill(character)
      .join('');
    return `${left}${prettyText}${right}`;
  } else {
    const left =
      leftPad > 1
        ? character +
          Array(leftPad - 1)
            .fill(' ')
            .join('')
        : character;
    const right =
      rightPad > 1
        ? Array(rightPad - 1)
            .fill(' ')
            .join('') + character
        : character;
    return `${left}${prettyText}${right}`;
  }
}

type Writer = (filePath: string, content: string) => void;
type Renamer = (srcPath: string, destPath: string) => void;

export class Exporter {
  private logContents: boolean = false;
  private destDir: string;
  private writer: Writer;
  private renamer: Renamer;

  constructor(
    logContents: boolean,
    destDir: string,
    write: Writer,
    rename: Renamer
  ) {
    this.logContents = logContents;
    this.destDir = destDir;
    this.writer = write;
    this.renamer = rename;
  }

  writeFile(fileName: string, content: string) {
    const destFilePath = resolve(this.destDir, fileName);

    if (this.logContents) {
      console.log(`
${chalk.blue(centerText('File Write', undefined, true))}
${chalk.blue(centerText(destFilePath, undefined, false))}
${chalk.blue(centerText('', '=', true))}
${content}
${chalk.blue(centerText('', '<', true))}`);
    }
    this.writer(destFilePath, content);
  }

  rename(srcPath: string, destPath: string): void {
    if (this.logContents) {
      console.log(`
${chalk.yellow(centerText('File Rename', undefined, true))}
${chalk.yellow(centerText(`${srcPath} -> ${destPath}`, undefined, false))}
${chalk.yellow(centerText('', '=', true))}`);
    }

    this.renamer(srcPath, destPath);
  }
}

export interface ReadonlyFileSystem {
  getExporter(dryRun: boolean, destDir: string): Exporter;
  readFile(filePath: string): string;
  listdir(dirName: string): string[];
  hasFile(filePath: string): boolean;
}

class FileSystem implements ReadonlyFileSystem {
  private cache: Map<string, string> = new Map();

  getExporter(dryRun: boolean, destDir: string): Exporter {
    return new Exporter(
      dryRun,
      destDir,
      dryRun
        ? (path: string, content: string) => {
            path = resolve(path);
            this.cache.set(path, content);
          }
        : (path: string, content: string) => {
            this.writeFile(path, content);
          },
      dryRun
        ? (srcPath: string, destPath: string) => {
            this.cache.set(destPath, this.readFile(srcPath));
            this.cache.delete(srcPath);
          }
        : this.renameFile
    );
  }

  readFile(filePath: string) {
    filePath = resolve(filePath);
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath);
    }

    if (!this.hasFile(filePath)) {
      return '';
    }

    const content = readFileSync(filePath).toString();
    this.cache.set(filePath, content);
    return content;
  }

  listdir(dirName: string): string[] {
    const files = readdirSync(dirName).concat(
      Array.from(this.cache.keys())
        .filter((filePath) => dirname(filePath) === dirName)
        .map((filePath) => basename(filePath))
    );
    return Array.from(new Set(files)).sort();
  }

  hasFile(filePath: string): boolean {
    filePath = resolve(filePath);
    try {
      return this.cache.has(filePath) || Boolean(statSync(filePath));
    } catch (e) {
      return false;
    }
  }

  private writeFile(filePath: string, content: string) {
    filePath = resolve(filePath);
    this.cache.set(filePath, content);

    mkdirp.sync(dirname(filePath));
    writeFileSync(filePath, content);
  }

  private renameFile(srcPath: string, destPath: string): void {
    renameSync(srcPath, destPath);
    this.cache.set(destPath, this.readFile(srcPath));
    this.cache.delete(srcPath);
  }
}

export const fs: ReadonlyFileSystem = new FileSystem();

export function renameExt(fileName: string, newExt: string): string {
  const pathObj = parse(fileName);
  pathObj.base = null;
  pathObj.ext = newExt;
  return format(pathObj);
}
