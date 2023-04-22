const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        var script = document.createElement('script');
        script.onload = function () {
            setupVue();            
            setupCytoscape();            
        };
        script.onerror = function () {
            alert(`Não consegui carregar ${script.src}`);
        };

        let algorithmType = urlParams.get('algorithmType') || 'greedy-backtracking';
        script.src = `../output/${algorithmType}-output.js`;

        document.head.appendChild(script); //or something of the likes

    function setupVue () {

        if (!window.logs) {
            let msg = `Logs não encontrados em ${script.src}`;
            alert(msg);
            throw new Error(msg);
        };

        /* Fallback on errors */
        logs = logs || [];

        Vue.config.performance = true

        const colors = ["lightpink","mediumslateblue","darkolivegreen","slategray","cyan","midnightblue","darkkhaki","chocolate","fuchsia","mediumblue","ghostwhite","deepskyblue","darkorange","magenta","seagreen","lightsteelblue","navy","darkseagreen","lightgray","coral","slategrey","blueviolet","goldenrod","skyblue","antiquewhite","brown","aquamarine","crimson","yellow","bisque","lightgrey","lightcyan","palevioletred","aqua","lightskyblue","darkgoldenrod","darksalmon","thistle","burlywood","darkred","peachpuff","darkturquoise","darkslategray","chartreuse","sienna","mediumpurple","palegoldenrod","white","steelblue","olivedrab","black","mediumturquoise","hotpink","deeppink","navajowhite","darkmagenta","darkslateblue","gray","seashell","firebrick","orangered","paleturquoise","tan","darkgreen","indianred","red","darkorchid","azure","olive","lightyellow","lightgreen","maroon","darkgray","sandybrown","royalblue","lightsalmon","plum","darkviolet","springgreen","lime","ivory","lightseagreen","lightslategrey","violet","purple","darkgrey","mediumaquamarine","greenyellow","salmon","limegreen","wheat","forestgreen","palegreen","gainsboro","whitesmoke","green","silver","moccasin","lightslategray","mediumspringgreen","orange","mistyrose","mintcream","darkblue","darkcyan","peru","beige","grey","lavender","saddlebrown","mediumvioletred","lavenderblush","papayawhip","blanchedalmond","honeydew","pink","lemonchiffon","orchid","lawngreen","darkslategrey","dodgerblue","indigo","lightgoldenrodyellow","khaki","cornflowerblue","cornsilk","dimgrey","lightcoral","lightblue","teal","gold","tomato","blue","dimgray","mediumorchid","floralwhite","cadetblue","snow","rosybrown","oldlace","powderblue","mediumseagreen","linen","slateblue","turquoise","aliceblue","yellowgreen"]
        window.colors = colors;        

        let melhoresColoracoes = logs.filter(action => action.key === 'melhorColoracao').filter(action => action.value.indexOf(-1) === -1);
        let coloracoesOrdenadas = melhoresColoracoes.slice().sort((a, b) => new Set(b.value).size - new Set(a.value).size);
        let numerosCromaticos = coloracoesOrdenadas.map(a => new Set(a.value).size);

        let redraw = (ctx) => {
            let returnFn = () => {
                if (ctx.timer !== 0) {
                    ctx.animationFrameHandle = true;
                    cyBacktracking.layout(cyBacktrackingLayout).run();
                    cyBacktracking.fit();   
                    window.requestAnimationFrame(returnFn);
                } else {
                    ctx.animationFrameHandle = false
                }
            }
            return returnFn;
        }

        var app4 = new Vue({
            el: '#app',
            vuetify: new Vuetify(),
            data: {
                graphFileName: graphFileName,
                algorithmType: algorithmType,
                /* Otimizacao de performance: evitar addDep no vue para os objetos imutáveis 
                https://reside-ic.github.io/blog/handling-long-arrays-performantly-in-vue.js/ */
                logs: Object.freeze(logs),
                adjList: Object.freeze(adjList),
                colors: Object.freeze(colors),
                coloracoesOtimas: Object.freeze(coloracoesOrdenadas.map(a => a.value)),
                numerosCromaticos: Object.freeze(numerosCromaticos),
                nVertices: adjList.length,
                nArestas: (adjList.map(v => v.length).reduce((a, c) => a + c, 0)) / 2,
                grauMaximo: Math.max(...adjList.map(v => v.length)),
                grauMinimo: Math.min(...adjList.map(v => v.length)),

                numeroCromatico: numerosCromaticos[numerosCromaticos.length - 1],
                problemData: {},
                currentStep: -1,
                parentItem: null,
                showLogs: false,
                showAdjacencyList: false,
                timer: 0,
                timerHandle: null,
                animationFrameHandle: false,
                renderBacktracking: true,
                backtrackingWithRequestAnimationFrame: false, 
                playbackSpeed: 0,

                backtrackingVerticesCount: 0,
                backtrackingEdgesCount: 0,
                maxOps: 10000
            },
            computed: {
                filteredLogs: function() {
                    let items = 100;
                    let lowerBound = Math.max(0, Math.floor(this.currentStep - items / 2));
                    let higherBound = Math.min(this.logs.length - 1, Math.floor(this.currentStep + items/ 2));
                    return logs.slice(lowerBound, higherBound).map((l, i) => ({...l, index: i + lowerBound}));
                },
                degreeOfSaturation: function(index) {
                    let coloracaoAtual = this.problemData.coloracaoAtual || this.adjList.map(() => -1);

                    let result = this.adjList.map((neighbors) => {
                        return new Set(
                            neighbors.map(n => coloracaoAtual[n]).filter(c => c !== -1)
                        ).size
                    });

                    return result;
                },
                maxDSATUR: function() {
                    return Math.max(...this.degreeOfSaturation);
                },
                candidates: function() {
                    return (this.problemData.ordenacao || []).slice(this.problemData.i).sort((a, b) => {
                        return (this.degreeOfSaturation[b] - this.degreeOfSaturation[a]) || (this.adjList[b].length - this.adjList[a].length)
                    });
                },
                grauMaximoRestante: function() {
                    return Math.max(...(this.problemData.ordenacao || []).slice(this.problemData.i).map(n => adjList[n]).map(l => l.length));
                },
                maxDSATURRestante: function() {
                    return Math.max(...(this.problemData.ordenacao || []).slice(this.problemData.i).map(n => this.degreeOfSaturation[n]));
                }
            },
            methods: {

                /* Both getStep and isOptimal could become computed properties */
                isOptimal: function(coloring) {
                    return this.numeroCromatico === new Set(coloring).size
                },
                getStep: function(coloring) {
                    return this.logs.findIndex(action => action.action === 'set' && action.key === 'melhorColoracao' && action.value.toString() === coloring.toString());
                },

                isMaxDegreeRestante: function(index) {
                    return this.adjList[index].length === this.grauMaximoRestante;
                },
                isMaxDSATURRestante: function(index) {
                    return this.degreeOfSaturation[index] === this.maxDSATURRestante;
                },
                isCandidate: function(index) {
                    let nextCandidate = this.candidates[0];
                    return (this.degreeOfSaturation[index] === this.degreeOfSaturation[nextCandidate]) && (this.adjList[index].length === this.adjList[nextCandidate].length);
                },

                applyAction: function (index, rerender = true) {
                    if (index >= this.logs.length)  {
                        index = this.logs.length - 1;
                    }

                    if (index < 0) return;

                    if (this.currentStep > index) {
                        this.problemData = {};
                        this.currentStep = -1;

                        if (this.renderBacktracking) {
                            cyBacktracking.remove('*');
                        }
                        this.backtrackingVerticesCount = 0;                            
                        this.backtrackingEdgesCount = 0;                        

                        this.parentItem = null;
                    }

                    while (this.currentStep < index) {
                            let action = this.logs[this.currentStep + 1];
                            switch (action.action) {
                                case "set":
                                    Vue.set(this.problemData, action.key, action.value);
                                    
                                    if (action.key === 'cor' && action.value !== -1) {
                                        let newNodeId = `${this.parentItem !== null ? `${this.parentItem},` : ''}${this.problemData.i}:${action.value}`;

                                        if (this.renderBacktracking) {
                                            cyBacktracking.add([
                                                {
                                                    group: 'nodes',
                                                    data: {
                                                        label: `${this.problemData.i} - {${this.problemData.indice}} color ${action.value}`,
                                                        color: action.value,
                                                        id: newNodeId
                                                    }
                                                }
                                            ])
                                        }
                                        this.backtrackingVerticesCount++;                                        

                                        if (this.parentItem !== null) {

                                            if (this.renderBacktracking) {
                                                cyBacktracking.add([
                                                    {
                                                        group: 'edges',
                                                        data: {
                                                            source: this.parentItem,
                                                            target: newNodeId,
                                                        }
                                                    }
                                                ])   
                                            }
                                            this.backtrackingEdgesCount++;  

                                        }

                                        /* force redraw for cytoscape */
                                        if (this.renderBacktracking && rerender) {
                                            cyBacktracking.layout(cyBacktrackingLayout).run();
                                            cyBacktracking.fit();
                                        }

                                    }

                                break;

                                case 'moveBackwards':
                                        if (this.parentItem !== null) {
                                            let possibleParent = this.parentItem.split(',').slice(0, -1).join(',');
                                            this.parentItem = possibleParent === '' ? null : possibleParent;
                                        }
                                break;

                                case 'moveForward':
                                    this.parentItem = `${this.parentItem !== null ? `${this.parentItem},` : ''}${this.problemData.i}:${this.problemData.cor}`;
                                break;

                            }
                            this.currentStep++;
                    }

                }
            },
            watch: {
                renderBacktracking: function(newValue, oldValue) {
                    if (newValue === false) {
                        cyBacktracking.remove('*');                    
                    } else {
                        let currentStep = this.currentStep;
                        this.applyAction(0);
                        this.applyAction(currentStep);
                    }
                },
                'problemData.coloracaoAtual': function (newValue, oldValue) {
                    if (newValue === oldValue) {
                        return;
                    }
                    for (let i = 0; i < newValue.length; i++) {
                        /* Get element by id is more performant */
                        cy.getElementById(i).data('color', newValue[i]);
                    }
                },
                parentItem: function(newValue, oldValue) {
                    if (newValue === oldValue) {
                        return;
                    }              
                    if (oldValue !== null) {
                        if (this.renderBacktracking) {
                            cyBacktracking.getElementById(oldValue).removeClass('selected');
                        }
                    }
                    if (newValue !== null) {
                        if (this.renderBacktracking) {
                            cyBacktracking.getElementById(newValue).addClass('selected');
                        }
                    }
                },
                currentStep: function (newValue, oldValue) {
                    if (this.showLogs === true) {                 
                        let logs = document.querySelector("#logs-list"); 
                        let stepDiv = document.querySelector(`[data-index="${newValue}"]`)
                        // Wait for currentStep to propagate
                        window.requestAnimationFrame(() => {
                            logs.scrollTop = stepDiv.offsetTop - (98 + 60); //hack, titles height
                        })
                    }
                },
                timer: function(newValue) {                          
                    clearInterval(this.timerHandle);
                    if (newValue !== 0) {
                        let that = this;
                        let comparison = performance.now() / 1000;
                        let initialStep = this.currentStep;

                        this.timerHandle = setInterval(() => {
                            let middleComparison = performance.now() / 1000;
                            
                            /* Ideally, (this.currentStep - initialStep) / (middleComparison - comparison) = newValue */
                            let deltaError = (middleComparison - comparison) * (newValue) - this.currentStep + initialStep;
                            that.playbackSpeed = (this.currentStep - initialStep) / (middleComparison - comparison)

                            /* Batch cytoscape calls for performance */
                            cy.startBatch()
                            that.applyAction(that.currentStep + Math.max(0, Math.round(deltaError) ), false);     
                            if (!that.backtrackingWithRequestAnimationFrame) {
                                cyBacktracking.layout(cyBacktrackingLayout).run();
                                cyBacktracking.fit();
                            }                                      
                            cy.endBatch()

                            /* Stop timer if reached final step */
                            if (this.currentStep === this.logs.length - 1) {
                                this.playbackSpeed = 0;
                                this.timer = 0;
                            }

                        }, 1000 / Math.min(Number(newValue), 60));

                        if (!this.animationFrameHandle) {
                            if (this.backtrackingWithRequestAnimationFrame) {
                                window.requestAnimationFrame(redraw(this));
                            }
                        }
                    }
                }
            }     
        })        
    }