function setupCytoscape() {

    let constraintsResult = [];
    Object.keys(adjList).forEach((key, arr) => {
        constraintsResult.push(
            {
                "data": {
                    "id": key,
                    "label": Number(key),
                    "type": "variable"
                },
                "classes": "item"
            },
        )
    })
    
    let r = adjList;
    
    r.forEach((arr, k) => {
        arr.forEach(v => {
            /* Only show each edge once */
            if (k > v) {
                constraintsResult.push(
                    {
                        "data": {
                            "source": k,
                            "target": v
                        }
                    },
                )
            }
        })
    })
    
    
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        window.cy = cytoscape({
            container: document.getElementById('cy'),
    
            boxSelectionEnabled: false,
            autounselectify: true,
    
            layout: {
                name: 'cose',
                nodeRepulsion: function (node) { return 1600999; },
            },
    
            style: [
    
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                    }
                },
    
                {
                    selector: 'edge',
                    style: {
                        'width': 4,
                        'line-color': '#9dbaea',
                        'target-arrow-color': '#9dbaea',
                        'curve-style': 'bezier'
                    }
                },
    
                {
                    selector: '.item',
                    style: {
                        'background-color': (item) => {
                            return colors[item.data('color')] || '#e4e4e4'
                        }
                    }
                }
            ],
    
            elements: constraintsResult.map(i => {
                return {
                    ...i,
                    data: {
                        ...i.data
                    }
                }
            })
        });
    
        let cyBacktrackingLayout = window.cyBacktrackingLayout = {
                name: 'breadthfirst',
                fit: true,
                directed: true,
                grid: true,
                padding: 10
            };
    
    
        var cyBacktracking = window.cyBacktracking = cytoscape({
            container: document.getElementById('cy-backtracking'),
    
            /* The options below may be used and increase performance:
            boxSelectionEnabled: false,
            autounselectify: true,
            autoungrabify: true, */
    
            layout: cyBacktrackingLayout,
            style: [
    
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'background-color': (item) => {
                            return colors[item.data('color')] || '#e4e4e4'
                        }                    
                    }
                },
    
                {
                    selector: '.selected',
                    style: {
                        'border-width': '5px',
                        'border-style': 'solid',
                        'border-color': '#000'
                    }
                },
    
                {
                    selector: '.visited',
                    style: {
                        'border-width': '5px',
                        'border-style': 'solid',
                        'border-color': '#ccc'
                    }
                },
    
                {
                    selector: 'edge',
                    style: {
                        'width': 4,
                        'line-color': '#9dbaea',
                        'target-arrow-color': '#9dbaea',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ],
    
            elements: []
        });
    
}