import React from 'react';

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, label, onClick }: any) => {
  const edgePath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd="url(#arrow)"
        style={{ strokeWidth: 2, stroke: '#888', cursor: 'pointer' }}
        onClick={() => onClick(id)}
      />
      <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '12px', cursor: 'pointer' }}>
        {label}
      </text>
    </>
  );
};

export default CustomEdge;
