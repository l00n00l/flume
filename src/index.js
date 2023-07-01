import React, { useContext } from "react";
import { useId } from "@reach/auto-id";
import Stage, { generate_menu_option } from "./components/Stage/Stage";
import Node from "./components/Node/Node";
import Comment from "./components/Comment/Comment";
import Toaster from "./components/Toaster/Toaster";
import Connections from "./components/Connections/Connections";
import {
  NodeTypesContext,
  PortTypesContext,
  NodeDispatchContext,
  ConnectionRecalculateContext,
  RecalculateStageRectContext,
  ContextContext,
  StageContext,
  CacheContext,
  EditorIdContext,
  OwnerContext
} from "./context";
import { createConnections } from "./connectionCalculator";
import nodesReducer, {
  connectNodesReducer,
  getInitialNodes
} from "./nodesReducer";
import { connectCommentsReducer } from "./commentsReducer";
import toastsReducer from "./toastsReducer";
import stageReducer from "./stageReducer";
import usePrevious from "./hooks/usePrevious";
import clamp from "lodash/clamp";
import Cache from "./Cache";
import { STAGE_ID, DRAG_CONNECTION_ID } from "./constants";
import styles from "./styles.css";
import { nanoid } from "nanoid/non-secure/index";
import { getStageRef, svgStyle } from "./connectionCalculator"
import ContextMenu from "./components/ContextMenu/ContextMenu";

export let generateMenuOption = generate_menu_option;
export let Ower = OwnerContext
export let GetSvgContainerRef = getStageRef
export let SvgContainerStyle = svgStyle

const defaultContext = {};

export let NodeEditor = (
  {
    comments: initialComments,
    nodes: initialNodes,
    nodeTypes = {},
    portTypes = {},
    defaultNodes = [],
    context = defaultContext,
    onChange,
    onCommentsChange,
    initialScale,
    spaceToPan = false,
    hideComments = false,
    disableComments = false,
    disableZoom = false,
    disablePan = false,
    circularBehavior,
    renderNodeHeader,
    debug,
  },
  ref
) => {
  const owner = useContext(OwnerContext)
  const editorId = useId();
  const cache = React.useRef(new Cache());
  const stage = React.useRef();
  const [sideEffectToasts, setSideEffectToasts] = React.useState()
  const [toasts, dispatchToasts] = React.useReducer(toastsReducer, []);
  const [nodes, dispatchNodes] = React.useReducer(
    connectNodesReducer(
      nodesReducer,
      { nodeTypes, portTypes, cache, circularBehavior, context, owner },
      setSideEffectToasts
    ),
    {},
    () => getInitialNodes(initialNodes, defaultNodes, nodeTypes, portTypes, context)
  );


  const [comments, dispatchComments] = React.useReducer(
    connectCommentsReducer(owner),
    initialComments || {}
  );
  React.useEffect(() => {
    dispatchNodes({ type: "HYDRATE_DEFAULT_NODES" });
  }, []);
  const [
    shouldRecalculateConnections,
    setShouldRecalculateConnections
  ] = React.useState(true);
  const [stageState, dispatchStageState] = React.useReducer(stageReducer, {
    scale: typeof initialScale === "number" ? clamp(initialScale, 0.1, 7) : 1,
    translate: { x: 0, y: 0 }
  });

  const recalculateConnections = React.useCallback(() => {
    createConnections(nodes, stageState, editorId);
  }, [nodes, editorId, stageState]);

  const recalculateStageRect = React.useCallback(() => {
    stage.current = document
      .getElementById(`${STAGE_ID}${editorId}`)
      .getBoundingClientRect();
  }, [editorId]);

  React.useLayoutEffect(() => {
    if (shouldRecalculateConnections) {
      recalculateConnections();
      setShouldRecalculateConnections(false);
    }
  }, [shouldRecalculateConnections, recalculateConnections]);

  const triggerRecalculation = React.useCallback(() => {
    setShouldRecalculateConnections(true);
  }, []);

  React.useImperativeHandle(ref, () => ({
    getNodes: () => {
      return nodes;
    },
    getComments: () => {
      return comments;
    }
  }));

  const previousNodes = usePrevious(nodes);

  React.useEffect(() => {
    if (previousNodes && onChange && nodes !== previousNodes) {
      onChange(nodes);
    }
  }, [nodes, previousNodes, onChange]);

  const previousComments = usePrevious(comments);

  React.useEffect(() => {
    if (previousComments && onCommentsChange && comments !== previousComments) {
      onCommentsChange(comments);
    }
  }, [comments, previousComments, onCommentsChange]);

  React.useEffect(() => {
    if (sideEffectToasts) {
      dispatchToasts(sideEffectToasts)
      setSideEffectToasts(null)
    }
  }, [sideEffectToasts])

  if (owner && owner.outOptions) {
    owner.dispatchNodes = dispatchNodes
    owner.getInitialNodes = getInitialNodes
    owner.dispatchComments = dispatchComments
    owner.outOptions({
      // 导出刷新cache, 当重新初始化所有的nodes的时候需要刷新cache
      refreshCache: () => {
        cache.current = new Cache()
      },
      recalculateStageRect,
      nanoid,
      editorId,
      triggerRecalculation,
    })
  }

  return (
    <PortTypesContext.Provider value={portTypes}>
      <NodeTypesContext.Provider value={nodeTypes}>
        <NodeDispatchContext.Provider value={dispatchNodes}>
          <ConnectionRecalculateContext.Provider value={triggerRecalculation}>
            <ContextContext.Provider value={context}>
              <StageContext.Provider value={stageState}>
                <CacheContext.Provider value={cache}>
                  <EditorIdContext.Provider value={editorId}>
                    <RecalculateStageRectContext.Provider
                      value={recalculateStageRect}
                    >
                      <Stage
                        editorId={editorId}
                        scale={stageState.scale}
                        translate={stageState.translate}
                        spaceToPan={spaceToPan}
                        disablePan={disablePan}
                        disableZoom={disableZoom}
                        dispatchStageState={dispatchStageState}
                        dispatchComments={dispatchComments}
                        disableComments={disableComments || hideComments}
                        stageRef={stage}
                        numNodes={Object.keys(nodes).length}
                        outerStageChildren={
                          <React.Fragment>
                            {debug && (
                              <div className={styles.debugWrapper}>
                                <button
                                  className={styles.debugButton}
                                  onClick={() => console.log(nodes)}
                                >
                                  Log Nodes
                                </button>
                                <button
                                  className={styles.debugButton}
                                  onClick={() =>
                                    console.log(JSON.stringify(nodes))
                                  }
                                >
                                  Export Nodes
                                </button>
                                <button
                                  className={styles.debugButton}
                                  onClick={() => console.log(comments)}
                                >
                                  Log Comments
                                </button>
                              </div>
                            )}
                            <Toaster
                              toasts={toasts}
                              dispatchToasts={dispatchToasts}
                            />
                          </React.Fragment>
                        }
                      >
                        {!hideComments &&
                          Object.values(comments).map(comment => (
                            <Comment
                              {...comment}
                              stageRect={stage}
                              dispatch={dispatchComments}
                              onDragStart={recalculateStageRect}
                              key={comment.id}
                            />
                          ))}
                        {Object.values(nodes).map(node => (
                          <Node
                            {...node}
                            stageRect={stage}
                            onDragEnd={triggerRecalculation}
                            onDragStart={recalculateStageRect}
                            renderNodeHeader={renderNodeHeader}
                            key={node.id}
                          />
                        ))}
                        <Connections nodes={nodes} editorId={editorId} />
                        <div
                          className={styles.dragWrapper}
                          id={`${DRAG_CONNECTION_ID}${editorId}`}
                        ></div>
                      </Stage>
                      {owner && owner.refreshNodeBoxShadow()}
                    </RecalculateStageRectContext.Provider>
                  </EditorIdContext.Provider>
                </CacheContext.Provider>
              </StageContext.Provider>
            </ContextContext.Provider>
          </ConnectionRecalculateContext.Provider>
        </NodeDispatchContext.Provider>
      </NodeTypesContext.Provider>
    </PortTypesContext.Provider>
  );
};
NodeEditor = React.forwardRef(NodeEditor);
export { FlumeConfig, Controls, Colors } from "./typeBuilders";
export { RootEngine } from "./RootEngine";
export const useRootEngine = (nodes, engine, context, options = {}) =>
  Object.keys(nodes).length ? engine.resolveRootNode(nodes, { ...options, context }) : {};
export { ContextMenu }