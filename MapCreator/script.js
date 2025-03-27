
// Initialization and Global Variables
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const backgroundImage = document.getElementById('background-image');
const canvasWrapper = document.getElementById('canvas-wrapper');
const loadImageBtn = document.getElementById('load-image-btn');
const imageInput = document.getElementById('image-input');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomLevelDisplay = document.getElementById('zoom-level');
const addNodeBtn = document.getElementById('add-node-btn');
const addConnectionBtn = document.getElementById('add-connection-btn');
const selectBtn = document.getElementById('select-btn');
const clearCanvasBtn = document.getElementById('clear-canvas-btn');
const downloadJsonBtn = document.getElementById('download-json-btn');

let shortestPath = [];
let markedNodes = new Set();
const sourceNodeSelect = document.getElementById('source-node');
const destinationNodeSelect = document.getElementById('destination-node');
const findPathBtn = document.getElementById('find-path-btn');
const clearPathBtn = document.getElementById('clear-path-btn');
const toggleMarkBtn = document.getElementById('toggle-mark');

// Zoom and Pan State
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;

// Node and Connection State
let nodes = [];
let connections = [];
let currentTool = 'select';
let selectedNode = null;
let draggingNode = null;
let connectionStartNode = null;
let mousePos = { x: 0, y: 0 };
let contextMenuNode = null;

// Modal and Context Menu Elements
const contextMenu = document.getElementById('context-menu');
const editNodeBtn = document.getElementById('edit-node');
const deleteNodeBtn = document.getElementById('delete-node');
const markSourceBtn = document.getElementById('mark-source');
const markDestinationBtn = document.getElementById('mark-destination');
const nodeModal = document.getElementById('node-modal');
const modalClose = document.querySelector('.close');
const saveNodeBtn = document.getElementById('save-node-btn');
const nodePropertiesPanel = document.getElementById('node-properties');

// Utility Functions
function convertScreenToWorldCoords(x, y) {
  return {
    x: (x - translateX) / scale,
    y: (y - translateY) / scale
  };
}

function convertWorldToScreenCoords(x, y) {
  return {
    x: x * scale + translateX,
    y: y * scale + translateY
  };
}

// Zoom Functions
function setZoom(newScale, centerX, centerY) {
  const minZoom = 0.1;
  const maxZoom = 5;

  newScale = Math.max(minZoom, Math.min(maxZoom, newScale));

  const dx = (centerX - translateX) / scale;
  const dy = (centerY - translateY) / scale;

  translateX -= dx * (newScale - scale);
  translateY -= dy * (newScale - scale);

  scale = newScale;

  zoomLevelDisplay.textContent = `${Math.round(scale * 100)}%`;
  redraw();
}

function zoomIn() {
  setZoom(scale * 1.2, canvas.width / 2, canvas.height / 2);
}

function zoomOut() {
  setZoom(scale / 1.2, canvas.width / 2, canvas.height / 2);
}

// Node Creation Function
function createNode(x, y) {
  const worldCoords = convertScreenToWorldCoords(x, y);
  const node = {
    id: uuid.v4(),
    x: worldCoords.x,
    y: worldCoords.y,
    label: `Node ${nodes.length + 1}`,
    color: '#3498db',
    size: 10,
    isSource: false,
    isDestination: false
  };
  nodes.push(node);
  return node;
}

// Node Finding Function
function findNodeAtPosition(x, y) {
  const worldCoords = convertScreenToWorldCoords(x, y);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const screenPos = convertWorldToScreenCoords(node.x, node.y);
    const distance = Math.sqrt(
      Math.pow(screenPos.x - x, 2) +
      Math.pow(screenPos.y - y, 2)
    );
    if (distance <= node.size * scale) {
      return node;
    }
  }
  return null;
}

// Drawing Functions
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);

  // Draw connections
  connections.forEach(connection => {
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (sourceNode && targetNode) {
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = connection.color || '#7f8c8d';
      ctx.lineWidth = connection.width || 2;
      ctx.stroke();
    }
  });

  // Draw shortest path if exists
  if (shortestPath.length > 0) {
    shortestPath.forEach(segment => {
      const fromNode = nodes.find(node => node.id === segment.from);
      const toNode = nodes.find(node => node.id === segment.to);

      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 4;

        // Create dashed line effect
        ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  // Draw nodes
  nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.fill();

    // Draw selection marker
    if (selectedNode && node.id === selectedNode.id) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw marked node marker
    if (markedNodes.has(node.id)) {
      ctx.strokeStyle = 'purple';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = `${node.size / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y + node.size + 5);
  });

  ctx.restore();
}

// Image Loading Function
function loadBackgroundImage(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    backgroundImage.onload = () => {
      // Reset zoom and pan
      scale = 1;
      translateX = 0;
      translateY = 0;
      zoomLevelDisplay.textContent = '100%';

      // Resize canvas to match wrapper
      canvas.width = canvasWrapper.clientWidth;
      canvas.height = canvasWrapper.clientHeight;

      redraw();
    };
    backgroundImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Connection Creation
function createConnection(sourceNode, targetNode) {
  // Check if connection already exists
  const connectionExists = connections.some(
    conn =>
      (conn.source === sourceNode.id && conn.target === targetNode.id) ||
      (conn.source === targetNode.id && conn.target === sourceNode.id)
  );

  if (!connectionExists && sourceNode !== targetNode) {
    const connection = {
      id: uuid.v4(),
      source: sourceNode.id,
      target: targetNode.id,
      color: '#7f8c8d',
      width: 2
    };
    connections.push(connection);
    return connection;
  }
  return null;
}

// Show Context Menu
function showContextMenu(x, y, node) {
  contextMenuNode = node;
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
}

// Hide Context Menu
function hideContextMenu() {
  contextMenu.style.display = 'none';
}

// Open Node Modal
function openNodeModal(node) {
  document.getElementById('node-id').value = node.id;
  document.getElementById('node-label').value = node.label;
  document.getElementById('node-color').value = node.color;
  document.getElementById('node-size').value = node.size;

  nodeModal.style.display = 'flex';
}

// Close Node Modal
function closeNodeModal() {
  nodeModal.style.display = 'none';
}

// Download JSON
function downloadJson() {
  const data = {
    nodes: nodes.map(node => ({
      id: node.id,
      label: node.label,
      x: node.x,
      y: node.y,
      color: node.color,
      size: node.size,
      isMarked: markedNodes.has(node.id)
    })),
    connections: connections.map(conn => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      color: conn.color,
      width: conn.width,
      weight: calculateEuclideanDistance(
        nodes.find(node => node.id === conn.source),
        nodes.find(node => node.id === conn.target)
      )
    }))
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'network-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function calculateEuclideanDistance(nodeA, nodeB) {
  return Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2));
}

function dijkstra(startNodeId, endNodeId) {
  // Create a graph representation
  const graph = {};
  nodes.forEach(node => {
    graph[node.id] = { connections: [], node: node };
  });

  connections.forEach(conn => {
    const weight = calculateEuclideanDistance(
      nodes.find(n => n.id === conn.source),
      nodes.find(n => n.id === conn.target)
    );

    graph[conn.source].connections.push({ to: conn.target, weight, connectionId: conn.id });
    graph[conn.target].connections.push({ to: conn.source, weight, connectionId: conn.id });
  });

  // Dijkstra algorithm
  const dist = {};
  const prev = {};
  const unvisited = new Set();

  nodes.forEach(node => {
    dist[node.id] = Infinity;
    prev[node.id] = null;
    unvisited.add(node.id);
  });

  dist[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minDist = Infinity;
    let minNode = null;

    unvisited.forEach(nodeId => {
      if (dist[nodeId] < minDist) {
        minDist = dist[nodeId];
        minNode = nodeId;
      }
    });

    if (minNode === null || minNode === endNodeId) break;

    unvisited.delete(minNode);

    // Process neighbors
    graph[minNode].connections.forEach(conn => {
      if (unvisited.has(conn.to)) {
        const alt = dist[minNode] + conn.weight;
        if (alt < dist[conn.to]) {
          dist[conn.to] = alt;
          prev[conn.to] = { fromId: minNode, connectionId: conn.connectionId };
        }
      }
    });
  }

  // Build path
  if (prev[endNodeId] === null) {
    return null; // No path exists
  }

  const path = [];
  let currentId = endNodeId;

  while (currentId !== startNodeId) {
    const prevInfo = prev[currentId];
    path.unshift({
      from: prevInfo.fromId,
      to: currentId,
      connectionId: prevInfo.connectionId
    });
    currentId = prevInfo.fromId;
  }

  return path;
}

function findShortestPath() {
  const sourceId = sourceNodeSelect.value;
  const destId = destinationNodeSelect.value;

  if (!sourceId) {
    alert("Please select a source node");
    return;
  }

  if (!destId) {
    alert("Please select a destination node");
    return;
  }

  if (sourceId === destId) {
    alert("Source and destination are the same node");
    return;
  }

  const path = dijkstra(sourceId, destId);

  if (path === null) {
    alert("No path exists between these nodes");
    shortestPath = [];
  } else {
    shortestPath = path;
  }

  redraw();
}

function clearPath() {
  shortestPath = [];
  redraw();
}

function updateNodeSelects() {
  // Clear existing options except the first one
  while (sourceNodeSelect.options.length > 1) {
    sourceNodeSelect.remove(1);
  }

  while (destinationNodeSelect.options.length > 1) {
    destinationNodeSelect.remove(1);
  }

  // Add all nodes as options
  nodes.forEach(node => {
    const sourceOption = document.createElement('option');
    sourceOption.value = node.id;
    sourceOption.text = node.label;
    sourceNodeSelect.add(sourceOption);

    const destOption = document.createElement('option');
    destOption.value = node.id;
    destOption.text = node.label;
    destinationNodeSelect.add(destOption);
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Tool Selection
  addNodeBtn.addEventListener('click', () => {
    currentTool = 'add-node';
    canvas.style.cursor = 'crosshair';
    updateNodeSelects();
  });

  addConnectionBtn.addEventListener('click', () => {
    currentTool = 'add-connection';
    canvas.style.cursor = 'crosshair';
    connectionStartNode = null;
  });

  selectBtn.addEventListener('click', () => {
    currentTool = 'select';
    canvas.style.cursor = 'default';
  });

  clearCanvasBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      nodes = [];
      connections = [];
      selectedNode = null;
      redraw();
    }
  });

  downloadJsonBtn.addEventListener('click', downloadJson);

  // Image Loading
  loadImageBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadBackgroundImage(file);
  });

  // Zoom Controls
  zoomInBtn.addEventListener('click', zoomIn);
  zoomOutBtn.addEventListener('click', zoomOut);

  canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(scale * delta, mouseX, mouseY);
    }
  });

  // Canvas Interaction
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Right-click context menu
    if (e.button === 2) {
      const node = findNodeAtPosition(x, y);
      if (node) {
        showContextMenu(e.clientX, e.clientY, node);
      }
      return;
    }

    // Pan functionality
    if (currentTool === 'select') {
      isDragging = true;
      lastX = x;
      lastY = y;

      const node = findNodeAtPosition(x, y);
      if (node) {
        draggingNode = node;
        selectedNode = node;
      }
    }

    // Node and connection creation
    switch (currentTool) {
      case 'add-node':
        const newNode = createNode(x, y);
        selectedNode = newNode;
        redraw();
        break;

      case 'add-connection':
        const clickedNode = findNodeAtPosition(x, y);
        if (clickedNode) {
          if (!connectionStartNode) {
            connectionStartNode = clickedNode;
          } else {
            createConnection(connectionStartNode, clickedNode);
            connectionStartNode = null;
            redraw();
          }
        }
        break;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Pan canvas
    if (isDragging && currentTool === 'select') {
      if (draggingNode) {
        // Move node
        const worldCoords = convertScreenToWorldCoords(x, y);
        draggingNode.x = worldCoords.x;
        draggingNode.y = worldCoords.y;
      } else {
        // Pan canvas
        translateX += x - lastX;
        translateY += y - lastY;
      }

      lastX = x;
      lastY = y;
      redraw();
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (draggingNode) {
      updateNodeSelects();
    }
    isDragging = false;
    draggingNode = null;
  });

  // Prevent default context menu
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Context Menu Actions
  editNodeBtn.addEventListener('click', () => {
    if (contextMenuNode) {
      openNodeModal(contextMenuNode);
      hideContextMenu();
    }
  });

  deleteNodeBtn.addEventListener('click', () => {
    if (contextMenuNode) {
      nodes = nodes.filter(node => node.id !== contextMenuNode.id);
      connections = connections.filter(
        conn => conn.source !== contextMenuNode.id &&
          conn.target !== contextMenuNode.id
      );
      selectedNode = null;
      redraw();
      hideContextMenu();
    }
    updateNodeSelects();
  });

  toggleMarkBtn.addEventListener('click', () => {
    if (contextMenuNode) {
      const nodeId = contextMenuNode.id;
      if (markedNodes.has(nodeId)) {
        markedNodes.delete(nodeId);
      } else {
        markedNodes.add(nodeId);
      }
      redraw();
      hideContextMenu();
      updateNodeSelects();
    }
  });

  // Pathfinding event listeners
  findPathBtn.addEventListener('click', findShortestPath);
  clearPathBtn.addEventListener('click', clearPath);

  // Update node selects when nodes change
  const updateNodesObserver = new MutationObserver(() => {
    updateNodeSelects();
  });

  // Initial population of node selects
  document.addEventListener('DOMContentLoaded', updateNodeSelects);


  // Modal Actions
  modalClose.addEventListener('click', closeNodeModal);

  saveNodeBtn.addEventListener('click', () => {
    const nodeId = document.getElementById('node-id').value;
    const nodeToUpdate = nodes.find(node => node.id === nodeId);

    if (nodeToUpdate) {
      nodeToUpdate.label = document.getElementById('node-label').value;
      nodeToUpdate.color = document.getElementById('node-color').value;
      nodeToUpdate.size = parseInt(document.getElementById('node-size').value);

      redraw();
      closeNodeModal();
    }
  });
}

// Initialization
function init() {
  canvas.width = canvasWrapper.clientWidth;
  canvas.height = canvasWrapper.clientHeight;

  setupEventListeners();
  updateNodeSelects();
  redraw();
}

// Initialize on page load
init();