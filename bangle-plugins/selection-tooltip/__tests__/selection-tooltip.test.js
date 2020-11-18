/**
 * @jest-environment jsdom
 */

/** @jsx psx */

import {
  psx,
  typeText,
  renderTestEditor,
} from 'bangle-core/test-helpers/index';

import { selectionTooltip } from '../index';
import { corePlugins, coreSpec } from 'bangle-core/components';
import { EditorState, PluginKey, TextSelection } from 'prosemirror-state';
import { SpecSheet } from 'bangle-core/spec-sheet';
import { createSelectionTooltipDOM } from '../create-selection-tooltip-dom';
import { updateTooltipOnSelectionChange } from '../selection-tooltip';
// due to some unknown issue, the view doesn't have focus
// when running test which causes tests to fail
jest.mock('bangle-plugins/helpers/index', () => {
  return {
    viewHasFocus: () => true,
  };
});

describe('selection-tooltip', () => {
  let testEditor, tooltipDOM, tooltipContentDOM, specSheet;
  let key = new PluginKey('selection_tooltip');
  beforeEach(() => {
    ({ tooltipDOM, tooltipContentDOM } = createSelectionTooltipDOM());
    tooltipContentDOM.textContent = 'hello world';

    specSheet = new SpecSheet([...coreSpec()]);

    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });
  });

  test('Correctly adds tooltip', async () => {
    const calculateType = jest.fn(() => 'default');
    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
        calculateType,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });

    const { view } = await testEditor(
      <doc>
        <para>[foo]bar</para>
      </doc>,
    );
    view.hasFocus = () => true;
    expect(key.getState(view.state)).toMatchObject({
      show: true,
    });
    expect(calculateType).toBeCalled();

    expect(view.dom.parentNode).toMatchInlineSnapshot(`
      <div
        data-testid="test-editor"
      >
        <div
          class="ProseMirror bangle-editor content"
          contenteditable="true"
        >
          <p>
            foobar
          </p>
        </div>
        <div
          class="bangle-tooltip"
          data-popper-placement="top"
          data-show=""
          data-tooltip-name="selectionTooltipPlacement"
          role="tooltip"
          style="position: absolute; left: 0px; top: 0px; margin: 0px; bottom: 0px; transform: translate(0px, -5px);"
        >
          <div
            class="bangle-tooltip-content"
          >
            hello world
          </div>
        </div>
      </div>
    `);
  });

  test('Has the correct state', async () => {
    const { view } = await testEditor(
      <doc>
        <para>[foo]bar</para>
      </doc>,
    );

    expect(view.dom.parentNode.contains(tooltipDOM)).toBe(true);
    expect(tooltipDOM.hasAttribute('data-show')).toBe(true);
    expect(key.getState(view.state)).toEqual({
      type: 'default',
      tooltipContentDOM,
      show: true,
      calculateType: expect.any(Function),
    });
  });

  test('No tooltip if no selection', async () => {
    const { view } = await testEditor(
      <doc>
        <para>foobar</para>
      </doc>,
    );

    expect(view.dom.parentNode.contains(tooltipDOM)).toBe(true);
    expect(tooltipDOM.hasAttribute('data-show')).toBe(false);
  });

  test('On typing hide tooltip', async () => {
    const { view } = await testEditor(
      <doc>
        <para>[foo]bar</para>
      </doc>,
    );

    expect(tooltipDOM.hasAttribute('data-show')).toBe(true);

    typeText(view, 'hello');
    expect(tooltipDOM.hasAttribute('data-show')).toBe(false);
  });

  test('Creating a selection should show tooltip, set type and  call calculateType', async () => {
    const calculateType = jest.fn((state, prevPluginState) => {
      return state.selection.empty ? null : 'test';
    });
    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
        calculateType,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });

    const { view } = await testEditor(
      <doc>
        <para>foo[]bar</para>
      </doc>,
    );

    expect(calculateType).nthCalledWith(1, expect.any(EditorState), null);

    expect(key.getState(view.state)).toMatchObject({
      show: false,
    });

    expect(calculateType).toBeCalledTimes(3);
    let selection = TextSelection.create(view.state.doc, 3, 5);
    view.dispatch(view.state.tr.setSelection(selection));

    expect(calculateType).toBeCalledTimes(4);
    expect(key.getState(view.state)).toMatchObject({
      show: true,
      type: 'test',
    });

    // empty selection
    selection = TextSelection.create(view.state.doc, 3, 3);
    view.dispatch(view.state.tr.setSelection(selection));
    expect(calculateType).toBeCalledTimes(5);
    expect(key.getState(view.state)).toMatchObject({
      show: false,
      type: null,
    });
  });
});

describe('commands', () => {
  let testEditor, tooltipDOM, tooltipContentDOM, specSheet;
  let key = new PluginKey('selection_tooltip');
  beforeEach(() => {
    ({ tooltipDOM, tooltipContentDOM } = createSelectionTooltipDOM());
    tooltipContentDOM.textContent = 'hello world';

    specSheet = new SpecSheet([...coreSpec()]);

    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });
  });
  test('updateSelectionTooltipType should not trigger calculateType', async () => {
    const calculateType = jest.fn((state, prevPluginState) => {
      return state.selection.empty ? null : 'test';
    });
    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
        calculateType,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });

    const { view } = await testEditor(
      <doc>
        <para>f[oo]bar</para>
      </doc>,
    );

    expect(calculateType).toBeCalledTimes(3);
    selectionTooltip.updateSelectionTooltipType(key, 'new_type')(
      view.state,
      view.dispatch,
      view,
    );
    expect(calculateType).toBeCalledTimes(3);
    expect(key.getState(view.state)).toMatchObject({
      show: true,
      type: 'new_type',
    });
  });

  test('updateSelectionTooltipType should create new instance of plugin state', async () => {
    const calculateType = jest.fn((state, prevPluginState) => {
      return state.selection.empty ? null : 'test';
    });
    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
        calculateType,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });

    const { view } = await testEditor(
      <doc>
        <para>f[oo]bar</para>
      </doc>,
    );

    expect(calculateType).toBeCalledTimes(3);
    selectionTooltip.updateSelectionTooltipType(key, 'new_type')(
      view.state,
      view.dispatch,
      view,
    );

    const stateBefore = key.getState(view.state);

    selectionTooltip.updateSelectionTooltipType(key, 'new_type')(
      view.state,
      view.dispatch,
      view,
    );

    const stateAfter = key.getState(view.state);

    // This allows for rerendering of the tooltip position
    expect(stateBefore).not.toBe(stateAfter);
    expect(stateBefore).toEqual(stateAfter);
  });

  test('hideSelectionTooltip', async () => {
    const { view } = await testEditor(
      <doc>
        <para>f[oo]bar</para>
      </doc>,
    );

    expect(key.getState(view.state)).toMatchObject({
      show: true,
      type: 'default',
    });

    selectionTooltip.hideSelectionTooltip(key)(view.state, view.dispatch, view);

    const stateBefore = key.getState(view.state);

    expect(stateBefore).toMatchObject({
      show: false,
      type: null,
    });

    // Send hide again to test of plugin state reference is preerved
    selectionTooltip.hideSelectionTooltip(key)(view.state, view.dispatch, view);

    const stateAfter = key.getState(view.state);

    expect(stateBefore).toBe(stateAfter);
  });

  test("updateTooltipOnSelectionChange doesn't dispatch if already hidden", async () => {
    const calculateType = jest.fn((state, prevPluginState) => {
      return state.selection.empty ? null : 'test';
    });
    const plugins = [
      ...corePlugins(),
      selectionTooltip.plugins({
        key,
        tooltipDOM,
        tooltipContentDOM,
        calculateType,
      }),
    ];

    testEditor = renderTestEditor({ specSheet, plugins });

    const { view } = await testEditor(
      <doc>
        <para>foo[]bar</para>
      </doc>,
    );

    expect(key.getState(view.state)).toMatchObject({
      show: false,
      type: null,
    });

    expect(
      updateTooltipOnSelectionChange(key)(view.state, view.dispatch, view),
    ).toBe(false);
  });

  test('querySelectionTooltipType', async () => {
    const { view } = await testEditor(
      <doc>
        <para>f[oo]bar</para>
      </doc>,
    );

    expect(selectionTooltip.querySelectionTooltipType(key)(view.state)).toBe(
      'default',
    );
  });

  test('queryIsTooltipActive', async () => {
    const { view } = await testEditor(
      <doc>
        <para>f[oo]bar</para>
      </doc>,
    );

    expect(tooltipDOM.hasAttribute('data-show')).toBe(true);

    expect(
      selectionTooltip.queryIsSelectionTooltipActive(key)(view.state),
    ).toBe(true);
  });
});
