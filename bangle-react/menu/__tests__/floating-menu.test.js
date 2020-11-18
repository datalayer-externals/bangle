/**
 * @jest-environment jsdom
 */

/** @jsx pjsx */
import { coreSpec } from 'bangle-core/components';
import { link } from 'bangle-core/index';
import { SpecSheet } from 'bangle-core/spec-sheet';
import { reactTestEditor, pjsx } from 'bangle-react/__tests__/helpers/index';
import { PluginKey, TextSelection } from 'prosemirror-state';
import { floatingMenu } from '../index';

jest.mock('bangle-plugins/helpers/index', () => {
  return {
    viewHasFocus: () => true,
  };
});

const menuKey = new PluginKey('floatingMenuTestKey');
const specSheet = new SpecSheet([...coreSpec()]);
const plugins = [
  link.plugins(),
  floatingMenu.plugins({
    key: menuKey,
  }),
];

describe('Link menu', () => {
  test('when no link', async () => {
    const testEditor = reactTestEditor({ specSheet, plugins });
    const { view, container } = await testEditor(
      <doc>
        <para>foo[]bar</para>
      </doc>,
    );

    expect(menuKey.getState(view.state)).toMatchObject({
      calculateType: expect.any(Function),
      show: false,
      tooltipContentDOM: expect.any(Object),
      type: null,
    });
    expect(container).toMatchSnapshot();
  });

  test('when link but not in selection', async () => {
    const testEditor = reactTestEditor({ specSheet, plugins });
    const { view } = await testEditor(
      <doc>
        <para>
          foo
          <link href="https://example.com">hello world</link>
          ba[]r
        </para>
      </doc>,
    );

    expect(menuKey.getState(view.state)).toMatchObject({
      calculateType: expect.any(Function),
      show: false,
      tooltipContentDOM: expect.any(Object),
      type: null,
    });
  });

  test('when selection moves inside link', async () => {
    const testEditor = reactTestEditor({ specSheet, plugins });
    const { view } = await testEditor(
      <doc>
        <para>
          foo
          <link href="https://example.com">hello world</link>
          ba[]r
        </para>
      </doc>,
    );

    expect(menuKey.getState(view.state)).toMatchObject({
      calculateType: expect.any(Function),
      show: false,
      tooltipContentDOM: expect.any(Object),
      type: null,
    });

    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.doc, view.state.doc.content.size - 6),
      ),
    );

    expect(menuKey.getState(view.state)).toMatchObject({
      calculateType: expect.any(Function),
      show: true,
      tooltipContentDOM: expect.any(Object),
      type: 'floatingLinkMenu',
    });
  });
});
