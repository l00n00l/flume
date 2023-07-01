import React from "react";
import styles from "./Stage.css";
import { Portal } from "react-portal";
import ContextMenu from "../ContextMenu/ContextMenu";
import { NodeTypesContext, NodeDispatchContext, OwnerContext } from "../../context";
import Draggable from "../Draggable/Draggable";
import orderBy from "lodash/orderBy";
import clamp from "lodash/clamp";
import { STAGE_ID } from '../../constants'

export function generate_menu_option(node) {
  return {
    value: node.type,
    label: node.label,
    description: node.description,
    sortIndex: node.sortIndex,
    node
  }
}

const Stage = ({
  scale,
  translate,
  editorId,
  dispatchStageState,
  children,
  outerStageChildren,
  numNodes,
  stageRef,
  spaceToPan,
  dispatchComments,
  disableComments,
  disablePan,
  disableZoom,
}) => {
  const owner = React.useContext(OwnerContext);
  const nodeTypes = React.useContext(NodeTypesContext);
  const dispatchNodes = React.useContext(NodeDispatchContext);
  const wrapper = React.useRef();
  const translateWrapper = React.useRef();
  const scaleWrapper = React.useRef();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuCoordinates, setMenuCoordinates] = React.useState({ x: 0, y: 0 });
  const dragData = React.useRef({ x: 0, y: 0 });
  const [spaceIsPressed, setSpaceIsPressed] = React.useState(false);


  const setStageRect = React.useCallback(() => {
    stageRef.current = wrapper.current.getBoundingClientRect();
  }, []);

  React.useEffect(() => {
    stageRef.current = wrapper.current.getBoundingClientRect();
    window.addEventListener("resize", setStageRect);
    return () => {
      window.removeEventListener("resize", setStageRect);
    };
  }, [stageRef, setStageRect]);

  const handleWheel = React.useCallback(
    e => {
      if (e.target.nodeName === "TEXTAREA" || e.target.dataset.comment) {
        if (e.target.clientHeight < e.target.scrollHeight) return;
      }
      e.preventDefault();
      if (numNodes === 0) return;
      dispatchStageState(({ scale: currentScale, translate: currentTranslate }) => {
        const delta = e.deltaY;
        const newScale = clamp(currentScale - clamp(delta, -10, 10) * 0.005, 0.1, 7);

        const byOldScale = (no) => no * (1 / currentScale);
        const byNewScale = (no) => no * (1 / newScale);

        const wrapperRect = wrapper.current.getBoundingClientRect();

        const xOld = byOldScale(e.clientX - wrapperRect.x - wrapperRect.width / 2 + currentTranslate.x);
        const yOld = byOldScale(e.clientY - wrapperRect.y - wrapperRect.height / 2 + currentTranslate.y);

        const xNew = byNewScale(e.clientX - wrapperRect.x - wrapperRect.width / 2 + currentTranslate.x);
        const yNew = byNewScale(e.clientY - wrapperRect.y - wrapperRect.height / 2 + currentTranslate.y);

        const xDistance = xOld - xNew;
        const yDistance = yOld - yNew;


        return {
          type: "SET_TRANSLATE_SCALE",
          scale: newScale,
          translate: {
            x: currentTranslate.x + xDistance * newScale,
            y: currentTranslate.y + yDistance * newScale
          }
        }
      });

    },
    [dispatchStageState, numNodes]
  );

  const handleDragDelayStart = e => {
    wrapper.current.focus();
  };

  const handleDragStart = e => {
    e.preventDefault();
    dragData.current = {
      x: e.clientX,
      y: e.clientY
    }; s
    if (owner && owner.onStageStartDrag) {
      owner.onStageStartDrag(e)
    }
  };

  const handleMouseDrag = (coords, e) => {
    const xDistance = dragData.current.x - e.clientX;
    const yDistance = dragData.current.y - e.clientY;
    const xDelta = translate.x + xDistance;
    const yDelta = translate.y + yDistance;
    wrapper.current.style.backgroundPosition = `${-xDelta}px ${-yDelta}px`;
    translateWrapper.current.style.transform = `translate(${-(
      translate.x + xDistance
    )}px, ${-(translate.y + yDistance)}px)`;
  };

  const handleDragEnd = e => {
    const xDistance = dragData.current.x - e.clientX;
    const yDistance = dragData.current.y - e.clientY;
    dragData.current.x = e.clientX;
    dragData.current.y = e.clientY;
    dispatchStageState(({ translate: tran }) => ({
      type: "SET_TRANSLATE",
      translate: {
        x: tran.x + xDistance,
        y: tran.y + yDistance
      }
    }));
  };

  const handleContextMenu = e => {
    e.preventDefault();
    setMenuCoordinates({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
    return false;
  };

  const closeContextMenu = () => {
    setMenuOpen(false);
  };

  const byScale = value => (1 / scale) * value;

  const addNode = ({ node, internalType, position = null }) => {
    const wrapperRect = wrapper.current.getBoundingClientRect();
    let x = 0
    let y = 0
    if (position) {
      x = position.x
      y = position.y
    } else {
      x =
        byScale(menuCoordinates.x - wrapperRect.x - wrapperRect.width / 2) +
        byScale(translate.x);
      y =
        byScale(menuCoordinates.y - wrapperRect.y - wrapperRect.height / 2) +
        byScale(translate.y);
    }

    if (internalType === "comment") {
      dispatchComments({
        type: "ADD_COMMENT",
        x,
        y
      });
    } else {
      dispatchNodes({
        type: "ADD_NODE",
        x,
        y,
        nodeType: node.type
      });
    }
  };

  const backScale = value => value * scale
  const nodeXY2ClientXY = (x, y) => {
    const wrapperRect = wrapper.current.getBoundingClientRect();
    const retX = backScale(x - byScale(translate.x)) + wrapperRect.x + wrapperRect.width / 2
    const retY = backScale(y - byScale(translate.y)) + wrapperRect.y + wrapperRect.height / 2
    return { x: retX, y: retY }
  }

  const handleDocumentKeyUp = e => {
    if (e.which === 32) {
      setSpaceIsPressed(false);
      document.removeEventListener("keyup", handleDocumentKeyUp);
    }
  };

  const handleKeyDown = e => {
    if (e.which === 32 && document.activeElement === wrapper.current) {
      e.preventDefault();
      e.stopPropagation();
      setSpaceIsPressed(true);
      document.addEventListener("keyup", handleDocumentKeyUp);
    }
  };

  const handleMouseEnter = () => {
    if (!wrapper.current.contains(document.activeElement)) {
      wrapper.current.focus();
    }
  };

  React.useEffect(() => {
    if (!disableZoom) {
      let stageWrapper = wrapper.current;
      stageWrapper.addEventListener("wheel", handleWheel);
      return () => {
        stageWrapper.removeEventListener("wheel", handleWheel);
      };
    }
  }, [handleWheel, disableZoom]);

  function generate_menu_options() {
    const options = orderBy(
      Object.values(nodeTypes)
        .filter(node => node.addable !== false)
        .map(generate_menu_option),
      ["sortIndex", "label"]
    )
    if (!disableComments) {
      options.push({ value: "comment", label: "Comment", description: "A comment for documenting nodes", internalType: "comment" })
    }
    return options
  }

  const menuOptions = generate_menu_options()

  // 导出函数
  if (owner && owner.outOptions) {
    owner.outOptions({
      addNode,
      setMenuOpen,
      setMenuCoordinates,
      handleContextMenu,
      nodeXY2ClientXY,
      draggableRef: wrapper,
      translateWrapper,
      scaleWrapper,
      dispatchStageState,
      stagetScale: scale,
      stagetTranslate: translate,
    })
  }

  return (
    <Draggable
      data-flume-component="stage"
      id={`${STAGE_ID}${editorId}`}
      className={styles.wrapper}
      innerRef={wrapper}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onDragDelayStart={handleDragDelayStart}
      onDragStart={handleDragStart}
      onDrag={handleMouseDrag}
      onDragEnd={handleDragEnd}
      onKeyDown={spaceToPan ? handleKeyDown : null}
      tabIndex={-1}
      stageState={{ scale, translate }}
      style={{ cursor: spaceIsPressed && spaceToPan ? "grab" : "" }}
      disabled={disablePan || (spaceToPan && !spaceIsPressed)}
      data-flume-stage={true}
      onMouseDown={e => {
        if (owner && owner.onStageDraggableMouseDown) {
          if (e.target == wrapper.current) {
            owner.onStageDraggableMouseDown(e)
          }
        }
      }}
      onMouseUp={e => {
        if (owner && owner.onStageDraggableMouseUp) {
          if (e.target == wrapper.current) {
            owner.onStageDraggableMouseUp(e)
          }
        }
      }}
    >
      {menuOpen ? (
        <Portal>
          <ContextMenu
            x={menuCoordinates.x}
            y={menuCoordinates.y}
            options={menuOptions}
            onRequestClose={closeContextMenu}
            onOptionSelected={(option) => {
              if (owner && owner.onOptionSelected) {
                owner.onOptionSelected(option)
              } else {
                addNode(option)
              }
            }}
            label="Add Node"
            from="stage"
          />
        </Portal>
      ) : null}
      <div
        ref={translateWrapper}
        className={styles.transformWrapper}
        style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
      >
        <div
          ref={scaleWrapper}
          className={styles.scaleWrapper}
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      {outerStageChildren}
    </Draggable>
  );
};
export default Stage;
