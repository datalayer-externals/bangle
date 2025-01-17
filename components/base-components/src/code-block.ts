import type Token from 'markdown-it/lib/token';
import type { MarkdownSerializerState } from 'prosemirror-markdown';

import type { RawPlugins, RawSpecs } from '@bangle.dev/core';
import {
  DOMOutputSpec,
  EditorState,
  keymap,
  Node,
  setBlockType,
  textblockTypeInputRule,
} from '@bangle.dev/pm';
import { moveNode } from '@bangle.dev/pm-commands';
import {
  createObject,
  filter,
  findParentNodeOfType,
  getNodeType,
  getParaNodeType,
  insertEmpty,
} from '@bangle.dev/utils';

export const spec = specFactory;
export const plugins = pluginsFactory;
export const commands = {
  queryIsCodeActiveBlock,
};
export const defaultKeys = {
  toCodeBlock: 'Shift-Ctrl-\\',
  moveDown: 'Alt-ArrowDown',
  moveUp: 'Alt-ArrowUp',
  insertEmptyParaAbove: 'Mod-Shift-Enter',
  insertEmptyParaBelow: 'Mod-Enter',
};

const name = 'codeBlock';

function specFactory(): RawSpecs {
  return {
    type: 'node',
    name,
    schema: {
      attrs: {
        language: { default: '' },
      },
      content: 'text*',
      marks: '',
      group: 'block',
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
      toDOM: (): DOMOutputSpec => ['pre', ['code', 0]],
    },
    markdown: {
      toMarkdown(state: MarkdownSerializerState, node: Node) {
        state.write('```' + (node.attrs['language'] || '') + '\n');
        state.text(node.textContent, false);
        state.ensureNewLine();
        state.write('```');
        state.closeBlock(node);
      },
      parseMarkdown: {
        code_block: { block: name, noCloseToken: true },
        fence: {
          block: name,
          getAttrs: (tok: Token) => ({ language: tok.info || '' }),
          noCloseToken: true,
        },
      },
    },
  };
}

function pluginsFactory({
  markdownShortcut = true,
  keybindings = defaultKeys,
} = {}): RawPlugins {
  return ({ schema }) => {
    const type = getNodeType(schema, name);

    return [
      markdownShortcut && textblockTypeInputRule(/^```$/, type),
      keybindings &&
        keymap(
          createObject([
            [keybindings.toCodeBlock, setBlockType(type)],

            [keybindings.moveUp, moveNode(type, 'UP')],
            [keybindings.moveDown, moveNode(type, 'DOWN')],

            [
              keybindings.insertEmptyParaAbove,
              filter(
                queryIsCodeActiveBlock(),
                insertEmpty(getParaNodeType(schema), 'above', false),
              ),
            ],
            [
              keybindings.insertEmptyParaBelow,
              filter(
                queryIsCodeActiveBlock(),
                insertEmpty(getParaNodeType(schema), 'below', false),
              ),
            ],
          ]),
        ),
    ];
  };
}

export function queryIsCodeActiveBlock() {
  return (state: EditorState) => {
    const type = getNodeType(state, name);
    return Boolean(findParentNodeOfType(type)(state.selection));
  };
}
