import { useEffect, useState, type SetStateAction } from 'react';
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    type Edge,
    type Node,
    MarkerType,
} from 'reactflow';

import 'reactflow/dist/style.css';

const ArbitrageDemo = () => {
    const initialNodes: Node[] = [
        { id: 'id1', style: { "width": "40px", "height": "40px", "borderRadius": '100px' }, position: { x: 0, y: 0 }, data: { label: '1' } },
        { id: 'id2', style: { "width": "40px", "height": "40px", "borderRadius": '100px' }, position: { x: 0, y: 100 }, data: { label: '2' } },
    ];
    const initialEdges: Edge[] = [
        {
            id: 'e1-2', source: 'id1', target: 'id2', label: '2.4239', type: 'smoothstep',
            animated: true, markerEnd: { type: MarkerType.ArrowClosed }
        },
        {
            id: 'e2-1', source: 'id2', target: 'id1', label: '2.4239', type: 'smoothstep',
            animated: true, markerEnd: { type: MarkerType.ArrowClosed }
        }
    ];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Edge modification.
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
    const [newLabel, setNewLabel] = useState('');

    useEffect(() => {
        if (selectedEdge && selectedEdge.label) {
            setNewLabel(selectedEdge.label.toString() || ''); // Set the input field value to the current label
        }
    }, [selectedEdge]);

    const onEdgeClick = (edgeEvent: any, edgeData: { id: string; }) => {
        console.log("🚀 ~ file: ArbitrageDemo.tsx:68 ~ onEdgeClick ~ edgeId:", edgeData.id)
        const edge = edges.find((el) => el.id === edgeData.id);
        if (edge)
            setSelectedEdge(edge);
    };

    const handleLabelChange = (event: { target: { value: SetStateAction<string>; }; }) => {
        setNewLabel(event.target.value);
    };

    const handleUpdateLabel = () => {
        if (selectedEdge) {
            setEdges((edges) => {
                const updatedElements = edges.map((element) => {
                    if (element.id === selectedEdge.id) {
                        return {
                            ...element,
                            label: newLabel,
                        };
                    }
                    return element;
                });
                return updatedElements;
            });
        }
    };

    return (
        <div style={{ height: '500px' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgeClick={onEdgeClick}
            >
                <Background />
                <Controls />
            </ReactFlow>

            {selectedEdge && (
                <div className="edge-label-editor">
                    <input type="text" value={newLabel} onChange={handleLabelChange} />
                    <button onClick={handleUpdateLabel}>Update Label</button>
                </div>
            )}

        </div>
    );
};



export default ArbitrageDemo;