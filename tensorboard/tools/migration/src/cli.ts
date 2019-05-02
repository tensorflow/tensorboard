#!/usr/bin/env node

import {execSync} from 'child_process';
import {normalize, relative, join, extname} from 'path';
import {Exporter, fs} from './helper';
import {transform as jsToTs} from './js-to-ts';
import {transform as toNewPolymer} from './polymerelementify';
import {transform as extractScript} from './script-extract';
import {transform as transferImport} from './transfer-import';
import {transform as transferHtml} from './polymer-html';
const mkdirp = require('mkdirp');
const program = require('commander');

program
  .version('0.0.1')
  .option('-d, --dry-run', 'Dry run')
  .option('--out-dir <path>', 'Ouput directory')
  .parse(process.argv);

program.args.slice(0).forEach((dirName: string) => {
  const destDir = program.outDir || '/tmp/tbmigrate';
  const equal = normalize(dirName) === normalize(destDir);
  const workingDir = equal
    ? dirName
    : join(destDir, relative(process.cwd(), dirName));
  const destRelPath = relative(normalize(dirName), normalize(destDir));
  console.log(destRelPath);
  const exporter = fs.getExporter(program.dryRun, destRelPath);

  if (!equal) {
    mkdirp.sync(workingDir);
    execSync(['cp', '-r', join(dirName, '*'), workingDir].join(' '));
  }

  op('.html', extractScript)(exporter, workingDir);
  op('.html', jsToTs)(exporter, workingDir);
  op('.ts', toNewPolymer)(exporter, workingDir);
  op('.html', transferImport)(exporter, workingDir);
  op('.html', transferHtml)(exporter, workingDir);
});

function op(
  fileExt: string,
  transform: (name: string, content: string, exporter: Exporter) => void
) {
  return (exporter: Exporter, dirName: string) => {
    const files = fs
      .listdir(dirName)
      .filter((name) => extname(name) === fileExt);

    files.forEach((fileName) => {
      fileName = join(dirName, fileName);
      transform(fileName, fs.readFile(fileName), exporter);
    });
  };
}
