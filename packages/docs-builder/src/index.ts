// Directories
// root:
//   -> docs
//   -> app/componennts/*.md
//   -> app/componennts/**/demo/*.md
//
//
// frontile
//  docs
//    - install.md
//    - whatever.md
//  packages/
//    forms/
//      docs/
//        - install.md
//        - styles.md
//      addon/components/*/
//        - name.md
//        demo/
//          - demo1.md
//          - demo2.md
//
//
//// intro
// install
// compoennts
//   button
//   button Group
// modifers
//   on
//   bla
// package
//   intro
//   bla
//   components
//     bla
//     blaf
//

import glob from 'glob';
import fs from 'fs';
import path from 'path';
import unified from 'unified';
import parse from 'remark-parse';
import frontmatter from 'remark-frontmatter';
import hbs from 'remark-hbs';
import html from 'remark-html';
import stringify from 'remark-stringify';
import visit from 'unist-util-visit';
import YAML from 'yaml';
import { Node } from 'unist';
import { Content } from './types';
import StructuredContentFn from './structed-content';

const projectRoot = '../../../';
const root = path.resolve(__dirname, projectRoot);

const stack = unified()
  .use(parse)
  .use(stringify)
  .use(frontmatter, [{ type: 'yaml', marker: '-' }])
  .use(hbs)
  .use(html);

const contents: Content[] = [];

function visitor(filepath: string, ast: Node): void {
  let metadata = {};

  visit(ast, 'yaml', (node) => {
    metadata = YAML.parse(node.value as string);
  });

  contents.push({
    filepath,
    ast,
    metadata,
    rendered: stack.stringify(ast)
  });
}

function findParentFromDemo(filepath: string): number {
  const folder = path.basename(path.dirname(filepath));

  let parentName = folder.replace('-demo', '');
  if (parentName === 'demo') {
    parentName = path.basename(path.dirname(path.dirname(filepath)));
  }

  return contents.findIndex((item: Content, _: number): boolean => {
    return (
      path.basename(item.filepath) === `${parentName}.md` ||
      (path.basename(item.filepath) === `index.md` &&
        path.basename(path.dirname(item.filepath)) === parentName)
    );
  });
}

const files = glob.sync('{/**/docs/**/*.md,/**/addon/**/*.md}', {
  root,
  ignore: [
    '/**/node_modules/**',
    '/**/.git/**',
    '/**/tmp/**',
    '/**/dist/**',
    '/packages/docs/**' // TODO: Make this configurable
  ]
});

files.forEach((file) => {
  const relativePath = file.replace(path.join(root, '/'), '');

  const ast = stack.parse(fs.readFileSync(file));
  visitor(relativePath, ast);
});

contents.forEach((item: Content, index: number): void => {
  const folder = path.basename(path.dirname(item.filepath));
  if (folder.match(/demo$/)) {
    const parent = contents[findParentFromDemo(item.filepath)];

    if (parent) {
      if (!parent.demos) {
        parent.demos = [item];
      } else {
        parent.demos.push(item);
      }

      contents.splice(index, 1);
    }
  }
});

StructuredContentFn(contents);
