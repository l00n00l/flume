import React from "react";
import styles from "./TextInput.css";
import { RecalculateStageRectContext, OwnerContext } from '../../context'
const TextInput = ({
  placeholder,
  updateNodeConnections,
  onChange,
  data,
  step,
  type,
  process = null,
  nodeId,
  portName,
  name,
}) => {
  const numberInput = React.useRef()
  const recalculateStageRect = React.useContext(RecalculateStageRectContext)
  const owner = React.useContext(OwnerContext)

  const handleDragEnd = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleDragEnd);
  };

  const handleMouseMove = e => {
    e.stopPropagation();
    updateNodeConnections();
  };

  const handlePossibleResize = e => {
    e.stopPropagation();
    recalculateStageRect();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleDragEnd);
    if (owner && owner.setInputing) {
      owner.setInputing(true)
    }
  };

  return (
    <div className={styles.wrapper} data-flume-component="text-input">
      {type === "number" ? (
        <input
          data-flume-component="text-input-number"
          onKeyDown={e => {
            if (e.keyCode === 69) {
              e.preventDefault()
              return false;
            }
          }}
          onChange={e => {
            let inputValue = e.target.value.replace(/e/g, "");
            if (process) {
              inputValue = process(inputValue, data)
            }
            if (!!inputValue) {
              const value = parseFloat(inputValue, 10);
              if (Number.isNaN(value)) {
                onChange(0);
              } else {
                onChange(value);
                numberInput.current.value = value;
              }
            }
          }}
          onBlur={e => {
            if (!e.target.value) {
              onChange(0);
              numberInput.current.value = 0;
            }
            if (owner && owner.setInputing) {
              owner.setInputing(false)
            }
          }}
          step={step || "1"}
          onMouseDown={handlePossibleResize}
          type={type || "text"}
          placeholder={placeholder}
          className={styles.input}
          defaultValue={data}
          onDragStart={e => e.stopPropagation()}
          ref={numberInput}
          data-node-id={nodeId}
          data-port-name={portName}
          data-name={name}
        />
      ) : (
        <textarea
          rows={1}
          data-flume-component="text-input-textarea"
          onChange={e => onChange(e.target.value)}
          onMouseDown={handlePossibleResize}
          type="text"
          placeholder={placeholder}
          className={styles.input}
          value={data}
          onDragStart={e => e.stopPropagation()}
          data-node-id={nodeId}
          data-port-name={portName}
          data-name={name}
          onBlur={e => {
            if (owner && owner.setInputing) {
              owner.setInputing(false)
            }
          }}
        />
      )}
    </div>
  );
};

export default TextInput;
