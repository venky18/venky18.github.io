function drawOrganizationChart(params) {
    listen();
    // console.log(params)
    params.funcs.expandAll = expandAll;
    params.funcs.search = searchUsers;
    params.funcs.closeSearchBox = closeSearchBox;
    params.funcs.findInTree = findInTree;
    params.funcs.clearResult = clearResult;
    params.funcs.reflectResults = reflectResults;
    // params.funcs.departmentClick = departmentClick;
    // params.funcs.back = back;
    params.funcs.toggleFullScreen = toggleFullScreen;
    params.funcs.locate = locate;
    params.funcs.download = JSONdownload;
    params.funcs.rename_node = rename_node;
    params.funcs.create_node = create_node;

    // connstant needs to be updated as data changes
    //
    var OrgTypesLevel1 = ['IDN'];
    var OrgTypesLevel2 = ['IDN_Filled', 'OSUB'];
    var OrgTypesLevel3 = ['IDN_Filled', 'HOSP', 'OSUB_Filled'];
    var OrgTypesLevel4 = ['CLIN', 'PHAR', 'INDP', 'WHOL', 'UNSPEC', 'CLIN', 'RC', 'PAYR', 'INDP', 'PHAR', 'HMHLT', 'HOSP_Filled'];
    var OrgTypesLevel5 = ['OUTLET'];
    var PAGINATION = 4;

    var create_node_modal_active = false;
    var rename_node_modal_active = false;
    var create_node_parent = null;
    var node_to_rename = null;
    var circularRemovedNode;
    var RelationSubtypeColors = {
        "Filled": "grey",
        "Owned": "blue",
        "Affiliated Purchasing": "teal",
        "Managed": "red",
        "Leased": "orange",
        "OWNERSHIP": "purple",
        "DEPARTMENT": "green",
        "OUTLET": "black"
    };

    var attrs = {
        EXPAND_SYMBOL: '\uf067',
        COLLAPSE_SYMBOL: '\uf068',
        selector: params.selector,
        root: params.data,
        width: params.chartWidth,
        height: params.chartHeight,
        index: 0,
        nodePadding: 9,
        collapseCircleRadius: 7,
        nodeHeight: 80,
        nodeWidth: 300,
        duration: 750,
        rootNodeTopMargin: 20,
        minMaxZoomProportions: [0.05, 3],
        linkLineSize: 200,
        collapsibleFontSize: '10px',
        userIcon: '\uf007',
        nodeStroke: "#bbdefb",
        nodeStrokeWidth: '1px'
    }


    var dynamic = {}
    dynamic.nodeImageWidth = attrs.nodeHeight * 100 / 140;
    dynamic.nodeImageHeight = attrs.nodeHeight - 2 * attrs.nodePadding;
    dynamic.nodeTextLeftMargin = attrs.nodePadding * 2 + dynamic.nodeImageWidth
    dynamic.rootNodeLeftMargin = attrs.width / 2;
    dynamic.nodePositionNameTopMargin = attrs.nodePadding + 8 + dynamic.nodeImageHeight / 4 * 1;
    dynamic.nodeChildCountTopMargin = attrs.nodePadding + 14 + dynamic.nodeImageHeight / 4 * 3;

    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20;
    var tree = d3.layout.tree().nodeSize([attrs.nodeWidth + 40, attrs.nodeHeight]);
    var diagonal = d3.svg.diagonal()
        .projection(function (d) {
            return [d.x + attrs.nodeWidth / 2, d.y + attrs.nodeHeight / 2];
        });

    var zoomBehaviours = d3.behavior
        .zoom()
        .scaleExtent(attrs.minMaxZoomProportions)
        .on("zoom", redraw);

    var svg = d3.select(attrs.selector)
        .append("svg")
        .attr("width", attrs.width)
        .attr("height", attrs.height)
        .call(zoomBehaviours)
        .append("g")
        .attr("transform", "translate(" + attrs.width / 2 + "," + 20 + ")");

    //necessary so that zoom knows where to zoom and unzoom from
    zoomBehaviours.translate([dynamic.rootNodeLeftMargin, attrs.rootNodeTopMargin]);

    attrs.root.x0 = 0;
    attrs.root.y0 = dynamic.rootNodeLeftMargin;

    attrs.root = JSON.parse(JSON.stringify(attrs.root).replace(/"children":/g, '"kids":'));
    function addPageno(d) {
        if (d && d.kids) {
            d.page = 1;
            d.children = [];
            d.kids.forEach(function (d1, i) {
                d1.pageNo = Math.ceil((i + 1) / PAGINATION);
                if (d.page === d1.pageNo) {
                    d.children.push(d1)
                }
                addPageno(d1);
            })
        }
    }
    addPageno(attrs.root)
    if (params.mode != 'department') {
        // adding unique values to each node recursively		
        var uniq = 1;
        addPropertyRecursive('uniqueIdentifier', function (v) {
            return uniq++;
        }, attrs.root);
    }

    expand(attrs.root);
    if (attrs.root.children) {
        attrs.root.children.forEach(collapse);
    }




    update(attrs.root);

    d3.select(attrs.selector).style("height", attrs.height);

    var tooltip = d3.select('body')
        .append('div')
        .attr('class', 'customTooltip-wrapper');

    var sidebar = d3.select('body')
        .append('div')
        .attr('class', 'sidebar-wrapper');
    var dragStarted = null;

    function generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }



    function create_node() {
        if (create_node_parent && create_node_modal_active) {
            if (create_node_parent._children != null) {
                create_node_parent.children = create_node_parent._children;
                create_node_parent._children = null;
            }
            if (create_node_parent.children == null) {
                create_node_parent.children = [];
            }
            id = generateUUID();
            name = $('#CreateNodeName').val();
            new_node = {
                "REL_TYPE": "Filled",
                "REL_SUBTYPE": "Filled",
                "ENTITY_ID": 17773320,
                "NO_OF_OSUBS": 3,
                "id": id,
                "NO_OF_HOSPS": 9,
                "NO_OF_SOCS": 269,
                "NO_OF_OUTLETS": 46,
                "ENTITY_NAME": $('#createChildName').val(),
                "ENTITY_TYPE": "CORP",
                "ENTITY_ORG_TYPE": "OUTLET",
                "ENTITY_ORG_SUBTYPE": "UNSPEC",
                "ENTITY_ADDR1": "1800 ORLEANS ST",
                "ENTITY_CITY": "BALTIMORE",
                "ENTITY_STATE": "MD",
                "ENTITY_ZIP": 21287,
                "ENTITY_340B_FLAG": "N",
                "ENTITY_SREP_ACCESS": "N",
                "children": null
            };
            // console.log('Create Node name: ' + name);
            create_node_parent.children.push(new_node);
            create_node_modal_active = false;
            $('#CreateNodeName').val('');

        }
        // close_modal();
        update(create_node_parent);
    }

    function rename_node() {
        if (node_to_rename && rename_node_modal_active) {
            name = $('#RenameNodeName').val();
            console.log('New Node name: ' + name);
            node_to_rename.ENTITY_NAME = name;
            rename_node_modal_active = false;

        }
        // close_modal();
        update(attrs.root);
        // debugger;
    }

    outer_update = null
    function update(source, param) {

        var menu = [
            {
                title: 'Rename node',
                action: function (elm, d, i) {
                    console.log('Rename node');
                    $("#RenameNodeName").val(d.name);
                    rename_node_modal_active = true;
                    node_to_rename = d
                    $('#RenameNodeModal').modal('show');
                }
            },
            {
                title: 'Delete node',
                action: function (elm, d, i) {
                    console.log('Delete node');
                    delete_node(d);
                }
            },
            {
                title: 'Create child node',
                action: function (elm, d, i) {
                    console.log('Create child node');
                    create_node_parent = d;
                    create_node_modal_active = true;
                    $('#CreateNodeModal').modal('show');
                    // $('#CreateNodeName').focus();
                }
            }
        ]
        function delete_node(node) {
            visit(source, function (d) {
                if (d.children) {
                    for (var child of d.children) {
                        if (child == node) {
                            // d.children = _.without(d.children, child);
                            d.children = d.children.filter(value => value != 0 && value != child)
                            update(attrs.root);
                            break;
                        }
                    }
                }
            },
                function (d) {
                    return d.children && d.children.length > 0 ? d.children : null;
                });
        }
        const getCircularReplacer = (deletePorperties) => { //func that allows a circular json to be stringified
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (deletePorperties) {
                        // delete value.id; //delete all properties you don't want in your json (not very convenient but a good temporary solution)
                        delete value.x0;
                        delete value.y0;
                        delete value.y;
                        delete value.x;
                        delete value.depth;
                        delete value.size;
                    }
                    if (seen.has(value)) {
                        return;
                    }
                    seen.add(value);
                }
                return value;
            };
        };

        var myRoot = JSON.stringify(attrs.root, getCircularReplacer(false)); //Stringify a first time to clone the root object (it's allow you to delete properties you don't want to save)
        var myvar = JSON.parse(myRoot);
        // debugger;
        circularRemovedNode = JSON.stringify(myvar, getCircularReplacer(true)); //Stringify a second time to delete the properties you don't need

        // console.log(circularRemovedNode); //You have your json in myvar


        function pan(domNode, direction) {
            var speed = panSpeed;
            if (panTimer) {
                clearTimeout(panTimer);
                translateCoords = d3.transform(svg.attr("transform"));
                if (direction == 'left' || direction == 'right') {
                    translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                    translateY = translateCoords.translate[1];
                } else if (direction == 'up' || direction == 'down') {
                    translateX = translateCoords.translate[0];
                    translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
                }
                scaleX = translateCoords.scale[0];
                scaleY = translateCoords.scale[1];
                scale = zoomListener.scale();
                svg.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
                d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
                zoomListener.scale(zoomListener.scale());
                zoomListener.translate([translateX, translateY]);
                panTimer = setTimeout(function () {
                    pan(domNode, speed, direction);
                }, 50);
            }
        }

        function initiateDrag(d, domNode) {
            draggingNode = d;
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
            d3.select(domNode).attr('class', 'node activeDrag');

            svg.selectAll("g.node").sort(function (a, b) { // select the parent and sort the path's
                if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
                else return -1; // a is the hovered element, bring "a" to the front
            });
            // if nodes has children, remove the links and nodes
            if (nodes.length > 1) {
                // remove link paths
                links = tree.links(nodes);
                nodePaths = svg.selectAll("path.link")
                    .data(links, function (d) {
                        return d.target.id;
                    }).remove();
                // remove child nodes
                nodesExit = svg.selectAll("g.node")
                    .data(nodes, function (d) {
                        return d.id;
                    }).filter(function (d, i) {
                        if (d.id == draggingNode.id) {
                            return false;
                        }
                        return true;
                    }).remove();
            }

            // remove parent link
            parentLink = tree.links(tree.nodes(draggingNode.parent));
            svg.selectAll('path.link').filter(function (d, i) {
                if (d.target.id == draggingNode.id) {
                    return true;
                }
                return false;
            }).remove();

            dragStarted = null;
        }
        var dragListener = d3.behavior.drag()
            .on("dragstart", function (d) {
                if (d == attrs.root) {
                    return;
                }
                dragStarted = true;
                nodes = tree.nodes(d);
                d3.event.sourceEvent.stopPropagation()
                // console.log("drag started")
                // console.log("event to strat drag",d3.event)

            })
            .on("drag", function (d) {
                // this is hardcoded for now
                // found it to be the best way
                // don't trigger d3 if the event source is from the collapsed wrapper
                // I believe there are better ways to handle this like event.stoppropagation and event.preventdefault
                // see test-dragndrop.html for a basic example
                if (["text-collapse", "node-collapse", "node-collapse-right-rect"].includes(d3.event.sourceEvent.srcElement.className.baseVal)) {
                    return;
                }
                if (d == attrs.root) {
                    return;
                }
                if (dragStarted) {
                    domNode = this;
                    initiateDrag(d, domNode);
                }
                relCoords = d3.mouse($('svg').get(0));
                if (relCoords[0] < panBoundary) {
                    panTimer = true;
                    pan(this, 'left');
                } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                    panTimer = true;
                    pan(this, 'right');
                } else if (relCoords[1] < panBoundary) {
                    panTimer = true;
                    pan(this, 'up');
                } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                    panTimer = true;
                    pan(this, 'down');
                } else {
                    try {
                        clearTimeout(panTimer);
                    } catch (e) {

                    }
                }
                d.x0 += d3.event.dx;
                d.y0 += d3.event.dy;
                var node = d3.select(this);
                // debugger;
                node.attr("transform", "translate(" + d.x0 + "," + d.y0 + ")")
                // console.log("ELEMENT POS",d.x0,d3.event.dy,d.y0,d3.event.dx)
                // console.log("dragging")
                // console.log("event to  draggging",d3.event)
            })
            .on("dragend", function (d) {
                if (d == attrs.root) {
                    return;
                }
                domNode = this;
                if (selectedNode) {
                    // now remove the element from the parent, and insert it into the new elements children
                    var index = draggingNode.parent.children.indexOf(draggingNode);
                    if (index > -1) {
                        draggingNode.parent.children.splice(index, 1);
                    }
                    if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                        if (typeof selectedNode.children !== 'undefined') {
                            selectedNode.children.push(draggingNode);
                        } else {
                            selectedNode._children.push(draggingNode);
                        }
                    } else {
                        selectedNode.children = [];
                        selectedNode.children.push(draggingNode);
                    }
                    // Make sure that the node being added to is expanded so user can see added node is correctly moved
                    // expand(selectedNode);
                    // sortTree();
                    console.log("dragged", selectedNode, "into", draggingNode)
                    endDrag();

                } else {
                    endDrag();
                }
                // console.log("drag-ended")
            });
        function endDrag() {
            selectedNode = null;
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
            d3.select(domNode).attr('class', 'node');
            // now restore the mouseover event or we won't be able to drag a 2nd time
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
            updateTempConnector();
            if (draggingNode !== null) {
                update(attrs.root);
                // centerNode(draggingNode);
                draggingNode = null;
            }
        }

        // Compute the new tree layout.
        var nodes = tree.nodes(attrs.root)
            .reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            d.y = d.depth * attrs.linkLineSize;
        });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++attrs.index);
            })

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .call(dragListener)
            .attr("transform", function (d) {
                return "translate(" + source.x0 + "," + source.y0 + ")";
            })




        var nodeGroup = nodeEnter.append("g")
            .attr("class", "node-group")




        nodeGroup.append("rect")
            .attr("width", attrs.nodeWidth)
            .attr("height", attrs.nodeHeight)
            .attr("data-node-group-id", function (d) {
                return d.uniqueIdentifier;
            })
            .attr("fill", function (d) {
                // debugger;
                var cl = ""
                if (d.ENTITY_NAME.startsWith("(Filled)")) {
                    cl = "#c5c5c5"
                }
                else {
                    cl = "white"
                }
                return cl
            })
            .attr("class", function (d) {
                var res = "";
                if (d.isLoggedUser) res += 'nodeRepresentsCurrentUser ';
                res += d._children || d.children ? "nodeHasChildren" : "nodeDoesNotHaveChildren";
                return res;
            });
        nodeGroup.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
            .style("fill", "blue")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function (node) {
                overCircle(node);
            })
            .on("mouseout", function (node) {
                outCircle(node);
            });

        var collapsiblesWrapper = nodeEnter.append('g')
            .attr('class', 'collapsible-circle')
            .attr('data-id', function (v) {
                return v.uniqueIdentifier;
            });

        var collapsibleRects = collapsiblesWrapper.append("rect")
            .attr('class', 'node-collapse-right-rect')
            .attr('height', attrs.collapseCircleRadius)
            .attr('fill', 'black')
            .attr('x', attrs.nodeWidth - attrs.collapseCircleRadius)
            .attr('y', attrs.nodeHeight - 7)
            .attr("width", function (d) {
                if (d.children || d._children) return attrs.collapseCircleRadius;
                return 0;
            })

        var collapsibles =
            collapsiblesWrapper.append("circle")
                .attr('class', 'node-collapse')
                .attr('cx', attrs.nodeWidth - attrs.collapseCircleRadius)
                .attr('cy', attrs.nodeHeight - 7)
                .attr("", setCollapsibleSymbolProperty);

        //hide collapse rect when node does not have children
        collapsibles.attr("r", function (d) {
            if (d.children || d._children) return attrs.collapseCircleRadius;
            return 0;
        })
            .attr("height", attrs.collapseCircleRadius)

        collapsiblesWrapper.append("text")
            .attr('class', 'text-collapse')
            .attr("x", attrs.nodeWidth - attrs.collapseCircleRadius)
            .attr('y', attrs.nodeHeight - 3)
            .attr('width', attrs.collapseCircleRadius)
            .attr('height', attrs.collapseCircleRadius)
            .style('font-size', attrs.collapsibleFontSize)
            .attr("text-anchor", "middle")
            .style('font-family', 'FontAwesome')
            .text(function (d) {
                return d.collapseText;
            })

        collapsiblesWrapper.on("click", click);
        // console.log("collaps wrapper", collapsiblesWrapper);
        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin)
            .attr("y", attrs.nodePadding + 10)
            .attr('class', 'entity-name')
            .attr("text-anchor", "left")
            .text(function (d) {
                return d.ENTITY_NAME.trim();
            })
            .call(wrap, 180);

        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin)
            .attr("y", dynamic.nodePositionNameTopMargin + 20)
            .attr('class', 'emp-position-name')
            .attr("dy", ".35em")
            .attr("text-anchor", "left")
            .text(function (d) {
                var position = d.ENTITY_ORG_TYPE.substring(0, 27);
                if (position.length < d.ENTITY_ORG_TYPE.length) {
                    position = position.substring(0, 24) + '...'
                }
                return position;
            })

        // nodeGroup.append("text")
        //     .attr("x", dynamic.nodeTextLeftMargin)
        //     .attr("y", attrs.nodePadding + 10 + dynamic.nodeImageHeight / 4 * 2)
        //     .attr('class', 'emp-area')
        //     .attr("dy", ".35em")
        //     .attr("text-anchor", "left")

        // .text(function(d) {
        //     return d.area;
        // })

        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin)
            .attr("y", dynamic.nodeChildCountTopMargin)
            .attr('class', 'emp-count-icon')
            .attr("text-anchor", "left")
            .style('font-family', 'FontAwesome')
            .text(function (d) {
                if (d.children || d._children) return attrs.userIcon;
            });

        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin + 13)
            .attr("y", dynamic.nodeChildCountTopMargin)
            .attr('class', 'emp-count')
            .attr("text-anchor", "left")

            .text(function (d) {
                if(d.children && d._children){
                return d.children.length + d._children.length;}
                else{
                    if(d.children){return d.children.length}
                    else if(d._children){return d._children.length}
                }
                
            })

        nodeGroup.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("id", "clip-rect")
            .attr("rx", 3)
            .attr('x', attrs.nodePadding)
            .attr('y', 2 + attrs.nodePadding)
            .attr('width', dynamic.nodeImageWidth)
            .attr('fill', 'none')
            .attr('height', dynamic.nodeImageHeight - 4)

        nodeGroup.append("svg:image")
            .attr('y', 2 + attrs.nodePadding)
            .attr('x', attrs.nodePadding)
            .attr('preserveAspectRatio', 'none')
            .attr('width', dynamic.nodeImageWidth)
            .attr('height', dynamic.nodeImageHeight - 4)
            .attr('clip-path', "url(#clip)")
            .attr("xlink:href", function (v) {
                // debugger;
                return CheckOrgTypeReturnImage(v)
            })
        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(attrs.duration)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })

        //todo replace with attrs object
        nodeUpdate.select("rect")
            .attr("width", attrs.nodeWidth)
            .attr("height", attrs.nodeHeight)
            .attr('rx', 3)
            .attr("stroke", function (d) {
                if (param && d.uniqueIdentifier == param.locate) {
                    return '#a1ceed'
                }
                return attrs.nodeStroke;
            })
            .attr('stroke-width', function (d) {
                if (param && d.uniqueIdentifier == param.locate) {
                    return 6;
                }
                return attrs.nodeStrokeWidth
            })
        // d3.select()
        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(attrs.duration)
            .attr("transform", function (d) {
                return "translate(" + source.x + "," + source.y + ")";
            })
            .remove();

        nodeExit.select("rect")
            .attr("width", attrs.nodeWidth)
            .attr("height", attrs.nodeHeight)

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function (d) {
                return d.target.id;
            });
        var color_rgb = ["red", "green", "blue"]
        var stroke_random = ["1px", "2px", "3px"]

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("x", attrs.nodeWidth / 2)
            .attr("y", attrs.nodeHeight / 2)
            // .attr("stroke", function(d) {
            //     return color_rgb[Math.floor(Math.random() * color_rgb.length)]
            // })
            .attr("stroke", function (d) {
                // debugger;
                console.log(RelationSubtypeColors[d.target.REL_TYPE])
                return RelationSubtypeColors[d.target.REL_TYPE]
            })
            // .style("stroke-dasharray", ("3, 3")) 
            .attr("stroke-width", function (d) {
                if (d.target.ENTITY_ORG_TYPE == "OSUB") {
                    // debugger;
                    return "4px"
                }
                else {
                    return "2px";
                }
            })

            .attr("d", function (d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(attrs.duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(attrs.duration)
            .attr("d", function (d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
        var parents = nodes.filter(function(d) {
            return (d.kids && d.kids.length > PAGINATION) ? true : false;
          });
        svg.selectAll(".page").remove();
        parents.forEach(function(p) {
            if (p._children)
              return;
            var p1 = p.children[p.children.length - 1];
            var p2 = p.children[0];
            var pagingData = [];
            if (p.page > 1) {
              pagingData.push({
                type: "prev",
                parent: p,
                no: (p.page - 1)
              });
            }
            if (p.page < Math.ceil(p.kids.length / PAGINATION)) {
              pagingData.push({
                type: "next",
                parent: p,
                no: (p.page + 1)
              });
            }
            var pageControl = svg.selectAll(".page")
              .data(pagingData, function(d) {
                return (d.parent.id + d.type);
              }).enter()
              .append("g")
              .attr("class", "page")
              .attr("transform", function(d) {
                var x = (d.type == "next") ? p2.y : p1.y;
                var y = (d.type == "prev") ? (p2.x - 30) : (p1.x + 30);
                return "translate(" + x + "," + y + ")";
              }).on("click", paginate);
          
            pageControl
              .append("circle")
              .attr("r", 15)
              .style("fill", "red");
            pageControl
              .append("image")
              .attr("xlink:href", function(d) {
                if (d.type == "next") {
                  return "https://dl.dropboxusercontent.com/s/p7qjclv1ulvoqw3/icon1.png"
                } else {
                  return "https://dl.dropboxusercontent.com/s/mdzt36poc1z39s3/icon3.png"
                }
              })
              .attr("x", -12.5)
              .attr("y", -12.5)
              .attr("width", 25)
              .attr("height", 25);
          });
          
          function paginate(d) {
            console.log(d, "data")
            d.parent.page = d.no;
            setPage(d.parent);
            update(attrs.root);
          }
          function setPage(d) {
            if (d && d.kids) {
              d.children = [];
              d.kids.forEach(function(d1, i) {
                if (d.page === d1.pageNo) {
                  d.children.push(d1);
                }
              })
            }
          }

        if (param && param.locate) {
            var x;
            var y;

            nodes.forEach(function (d) {
                if (d.uniqueIdentifier == param.locate) {
                    x = d.x;
                    y = d.y;
                }
            });

            // normalize for width/height
            var new_x = (-x + (window.innerWidth / 2));
            var new_y = (-y + (window.innerHeight / 2));

            // move the main container g
            svg.attr("transform", "translate(" + new_x + "," + new_y + ")")
            zoomBehaviours.translate([new_x, new_y]);
            zoomBehaviours.scale(1);
        }

        if (param && param.centerMySelf) {
            var x;
            var y;

            nodes.forEach(function (d) {
                if (d.isLoggedUser) {
                    x = d.x;
                    y = d.y;
                }

            });

            // normalize for width/height
            var new_x = (-x + (window.innerWidth / 2));
            var new_y = (-y + (window.innerHeight / 2));

            // move the main container g
            svg.attr("transform", "translate(" + new_x + "," + new_y + ")")
            zoomBehaviours.translate([new_x, new_y]);
            zoomBehaviours.scale(1);
        }

        /*################  TOOLTIP  #############################*/

        function getTagsFromCommaSeparatedStrings(tags) {
            return tags.split(',').map(function (v) {
                return '<li><div class="tag">' + v + '</div></li>  '
            }).join('');
        }

        function sideBarContent(item) {
            var addvar = item.ENTITY_ADDR1 + ", " + item.ENTITY_STATE + ", " + item.ENTITY_CITY + ", " + item.ENTITY_ZIP;

            var strVar = "";
            strVar += '<div class="ui card sidebarcard">'
            strVar += '<div class="content">'
            strVar += '<img class="left floated mini ui image" src="https://semantic-ui.com/images/avatar/large/elliot.jpg" style="height:  30px;">'
            strVar += '<div class="header">' + toTitleCase(item.ENTITY_NAME) + '</div>'
            strVar += '<div class="meta">' + item.ENTITY_ORG_TYPE + '</div>'
            strVar += '<div><address> <a target="_blank" href="' + 'https://maps.google.com/?q=' + addvar + '">' + addvar + ' </a> </address></div>'
            strVar += '<div class="ui divider"></div><div class="description">'
            strVar += '<div>Net Patient Revenue </span> <span class= "right-float"><b>$ 3.5B</b></span> </div><br>'
            strVar += '<div>Net Income: </span> <span class= "right-float"><b>$ 2.3B</b></span> </div><br>'
            strVar += '<div>Net Income Margin: </span> <span class= "right-float"><b>$ 1.9B</b></span> </div>'
            strVar += '<div class="ui divider"></div>'
            strVar += '<div>No of Employed Physicians  </span> <span class= "right-float"><b>342</b></span> </div><br>'
            strVar += '<div>No of Affiliated OSUBs </span> <span class= "right-float"><b>' + item.NO_OF_OSUBS + '</b></span> </div><br>'
            strVar += '<div>No of Affiliated Hospitals </span> <span class= "right-float"><b>' + item.NO_OF_HOSPS + '</b></span> </div><br>'
            strVar += '<div>No of Affiliated SOCs </span> <span class= "right-float"><b>' + item.NO_OF_SOCS + '</b></span> </div>'
            strVar += '<div class="ui divider"></div>'
            strVar += '<div>Structure Segment: </span> <span class= "right-float"><b>Low</b></span> </div><br>'
            strVar += '<div>Patient Experience Segment: </span> <span class= "right-float"><b>Medium</b></span> </div><br>'
            strVar += '<div>Quality Segment: </span> <span class= "right-float"><b>Medium</b></span> </div><br>'
            strVar += '<div>Research Segment: </span> <span class= "right-float"><b>High</b></span> </div><br>'
            strVar += '<div>Willingness to Partner Segment: </span> <span class= "right-float"><b>Medium</b></span> </div><br>'
            strVar += '<div>Structure Segment: </span> <span class= "right-float"><b>High</b></span> </div><br>'
            strVar += '<div>Expression Segment: </span> <span class= "right-float"><b>High</b></span> </div>'
            strVar += '</div>'
            strVar += '</div>'

            return strVar
        }
        function tooltipContent(item) {

            var strVar = "";
            // console.log(item)
            strVar += '<div class="ui card">'
            strVar += '<div class="content">'
            strVar += '<img class="right floated mini ui image" src="https://semantic-ui.com/images/avatar/large/elliot.jpg" style="height:  30px;">'
            strVar += '<div class="header">' + toTitleCase(item.ENTITY_NAME) + '</div>'
            strVar += '<div class="meta">' + item.ENTITY_ORG_TYPE + '</div>'
            strVar += '<div class="">' + item.ENTITY_ADDR1 + ", " + item.ENTITY_STATE + ", " + item.ENTITY_CITY + ", " + item.ENTITY_ZIP + '</div>'
            strVar += '<br>'
            strVar += '<div class="">' + "Relationship" + ": " + item.REL_TYPE + "-" + item.REL_SUBTYPE + '</div>'
            strVar += '<br>'
            strVar += '<div class="">' + "Rep Access" + ": " + item.ENTITY_SREP_ACCESS + '</div>'
            strVar += '</div>'
            strVar += '<div class="extra content">'
            strVar += '<div class="ui small horizontal list">'
            strVar += '<div class="item"><div class="header">' + item.NO_OF_HOSPS + " HOSPS" + '</div></div>'
            strVar += '<div class="item"><div class="header">' + item.NO_OF_OUTLETS + " OUTLETS" + '</div></div>'
            strVar += '<div class="item"><div class="header">' + item.NO_OF_SOCS + " SOCS" + '</div></div>'
            strVar += '<div class="item"><div class="header">' + item.NO_OF_OSUBS + " OSUBS" + '</div></div>'
            strVar += '</div>'
            strVar += '</div>'

            return strVar;

        }

        function tooltipHoverHandler(d) {

            // console.log("Event from tooltip hover",d3.event)
            // if(d3.event.fromElement.tagName != "rect"){return;}
            var content = tooltipContent(d);
            tooltip.html(content);

            tooltip.transition()
                .duration(200).style("opacity", "1").style('display', 'block');
            d3.select(this).attr('cursor', 'pointer').attr("stroke-width", 50);

            var y = d3.event.pageY;
            var x = d3.event.pageX;
            // debugger;
            // restrict tooltip to fit in borders
            // if (y < 220) {
            //     y += 220 - y;
            //     x += 130;
            // }
            if (x > attrs.width - 300) {
                x -= 300 - (attrs.width - x);
            }

            if (y > attrs.height - 300) {
                y -= 300 - (attrs.height - y);
            }

            tooltip.style('top', (y + 20) + 'px')
                .style('left', (x + 20) + 'px');
            // debugger;
        }
        function sideBarHandler(d) {
            var content = sideBarContent(d)
            sidebar.html(content);
            d3.select('.sidebar-wrapper').style('display', 'block').style('opacity', 1)
            $('#sideBar').show()
            console.log("sidebar")



        }
        function sideBarOutHandler(d) {
            sidebar.transition()
                .duration(200)
                .style('opacity', '0').style('display', 'none');
            d3.select('div.sidebar-wrapper').select('div.ui.card').remove()

        }

        function tooltipOutHandler() {
            tooltip.transition()
                .duration(200)
                .style('opacity', '0').style('display', 'none');
            d3.select(this).attr("stroke-width", 5);
            d3.select('div.customTooltip-wrapper').select('div.ui.card').remove()

        }


        nodeGroup.on('click', sideBarHandler);
        nodeGroup.on('mouseover', tooltipHoverHandler);
        // nodeGroup.on('mousemove',tooltipMoveHandler);
        nodeGroup.on('mouseout', tooltipOutHandler);
        nodeGroup.on('contextmenu', d3.contextMenu(menu));



        function equalToEventTarget() {
            return this == d3.event.target;
        }

        d3.select("body").on("click", function () {
            var outside = tooltip.filter(equalToEventTarget).empty();
            if (outside) {
                tooltip.style('opacity', '0').style('display', 'none');

            }
            // var outside1 = sidebar.filter(equalToEventTarget).empty();
            // if (outside1){
            //     sidebar.style('opacity', '0').style('display', 'none');

            // }
        });

    }

    // Toggle children on click.
    function click(d) {
        // if (d3.event.defaultPrevented) return; // click suppressed
        // console.log("Event Printing", d3.event);
        // debugger;
        d3.select(this).select("text").text(function (dv) {

            if (dv.collapseText == attrs.EXPAND_SYMBOL) {
                dv.collapseText = attrs.COLLAPSE_SYMBOL
            } else {
                if (dv.children) {
                    dv.collapseText = attrs.EXPAND_SYMBOL
                }
            }
            return dv.collapseText;

        })

        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);

    }

    //########################################################

    //Redraw for zoom
    function redraw() {
        //console.log("here", d3.event.translate, d3.event.scale);
        svg.attr("transform",
            "translate(" + d3.event.translate + ")" +
            " scale(" + d3.event.scale + ")");
    }

    // #############################   Function Area #######################
    function wrap(text, width) {

        text.each(function () {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0, //parseFloat(text.attr("dy")),
                tspan = text.text(null)
                    .append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", ++lineNumber * lineHeight + dy + "em")
                        .text(word);
                }
            }
        });
    }

    function addPropertyRecursive(propertyName, propertyValueFunction, element) {
        if (element[propertyName]) {
            element[propertyName] = element[propertyName] + ' ' + propertyValueFunction(element);
        } else {
            element[propertyName] = propertyValueFunction(element);
        }
        if (element.children) {
            element.children.forEach(function (v) {
                addPropertyRecursive(propertyName, propertyValueFunction, v)
            })
        }
        if (element._children) {
            element._children.forEach(function (v) {
                addPropertyRecursive(propertyName, propertyValueFunction, v)
            })
        }
    }


    function getEmployeesCount(node) {
        var count = 1;
        countChilds(node);
        return count;

        function countChilds(node) {
            var childs = node.children ? node.children : node._children;
            if (childs) {
                childs.forEach(function (v) {
                    count++;
                    countChilds(v);
                })
            }
        }
    }

    function CheckOrgTypeReturnImage(v) {
        if (OrgTypesLevel1.includes(v.ENTITY_ORG_TYPE)) {
            return 'images/IDN_B.png';
        } else if (OrgTypesLevel2.includes(v.ENTITY_ORG_TYPE)) {
            return 'images/OSUB_B.png';
        } else if (OrgTypesLevel3.includes(v.ENTITY_ORG_TYPE)) {
            return 'images/Hospital_B.png';
        } else if (OrgTypesLevel4.includes(v.ENTITY_ORG_TYPE)) {
            return 'images/SOC_B.png';
        } else if (OrgTypesLevel5.includes(v.ENTITY_ORG_TYPE)) {
            return 'images/OUTLET_B.png';
        }
    }

    function reflectResults(results) {
        var htmlStringArray = results.map(function (result) {
            var strVar = "";
            strVar += "         <div class=\"list-item\">";
            strVar += "          <a >";
            strVar += "            <div class=\"image-wrapper\">";

            strVar += "              <img class=\"image\" src=\"" + CheckOrgTypeReturnImage(result) + "\"\/>";
            strVar += "            <\/div>";
            strVar += "            <div class=\"description\">";
            strVar += "              <p class=\"name\">" + result.ENTITY_NAME + "<\/p>";
            strVar += "               <p class=\".entity-type\">" + result.ENTITY_ORG_TYPE + "<\/p>";
            strVar += "               <p class=\"area\">" + result.area + "<\/p>";
            strVar += "            <\/div>";
            strVar += "            <div class=\"buttons\">";
            strVar += "              <a target='_blank' href='" + result.profileUrl + "'><button class='btn-search-box btn-action'>View Profile<\/button><\/a>";
            strVar += "              <button class='btn-search-box btn-action btn-locate' onclick='params.funcs.locate(" + result.uniqueIdentifier + ")'>Locate <\/button>";
            strVar += "            <\/div>";
            strVar += "          <\/a>";
            strVar += "        <\/div>";

            return strVar;

        })

        var htmlString = htmlStringArray.join('');
        params.funcs.clearResult();

        var parentElement = get('.result-list');
        var old = parentElement.innerHTML;
        var newElement = htmlString + old;
        parentElement.innerHTML = newElement;
        set('.user-search-box .result-header', "RESULT - " + htmlStringArray.length);

    }

    function clearResult() {
        set('.result-list', '<div class="buffer" ></div>');
        set('.user-search-box .result-header', "RESULT");

    }

    function listen() {
        var input = get('.user-search-box .search-input');

        input.addEventListener('input', function () {
            var value = input.value ? input.value.trim() : '';
            if (value.length < 3) {
                params.funcs.clearResult();
            } else {
                var searchResult = params.funcs.findInTree(params.data, value);
                params.funcs.reflectResults(searchResult);
            }

        });
    }

    function searchUsers() {

        d3.selectAll('.user-search-box')
            .transition()
            .duration(250)
            .style('width', '350px')
    }

    function closeSearchBox() {
        d3.selectAll('.user-search-box')
            .transition()
            .duration(250)
            .style('width', '0px')
            .each("end", function () {
                params.funcs.clearResult();
                clear('.search-input');
            });

    }

    function findInTree(rootElement, searchText) {
        var result = [];
        // use regex to achieve case insensitive search and avoid string creation using toLowerCase method
        var regexSearchWord = new RegExp(searchText, "i");

        recursivelyFindIn(rootElement, searchText);

        return result;

        function recursivelyFindIn(user) {
            if (user.ENTITY_NAME.match(regexSearchWord)) {
                result.push(user)
            }

            var childUsers = user.children ? user.children : user._children;
            if (childUsers) {
                childUsers.forEach(function (childUser) {
                    recursivelyFindIn(childUser, searchText)
                })
            }
        };
    }


    function expandAll() {
        expand(root);
        update(root);
    }

    function expand(d) {
        if (d.children) {
            d.children.forEach(expand);
        }

        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }

        if (d.children) {
            // if node has children and it's expanded, then  display -
            setToggleSymbol(d, attrs.COLLAPSE_SYMBOL);
        }
    }

    function collapse(d) {
        if (d._children) {
            d._children.forEach(collapse);
        }
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }

        if (d._children) {
            // if node has children and it's collapsed, then  display +
            setToggleSymbol(d, attrs.EXPAND_SYMBOL);
        }
    }

    function setCollapsibleSymbolProperty(d) {
        if (d._children) {
            d.collapseText = attrs.EXPAND_SYMBOL;
        } else if (d.children) {
            d.collapseText = attrs.COLLAPSE_SYMBOL;
        }
    }

    function setToggleSymbol(d, symbol) {
        d.collapseText = symbol;
        d3.select("*[data-id='" + d.uniqueIdentifier + "']").select('text').text(symbol);
    }

    /* recursively find logged user in subtree */
    function findmySelf(d) {
        if (d.isLoggedUser) {
            expandParents(d);
        } else if (d._children) {
            d._children.forEach(function (ch) {
                ch.parent = d;
                findmySelf(ch);
            })
        } else if (d.children) {
            d.children.forEach(function (ch) {
                ch.parent = d;
                findmySelf(ch);
            });
        };

    }

    function locateRecursive(d, id) {
        if (d.uniqueIdentifier == id) {
            expandParents(d);
        } else if (d._children) {
            d._children.forEach(function (ch) {
                ch.parent = d;
                locateRecursive(ch, id);
            })
        } else if (d.children) {
            d.children.forEach(function (ch) {
                ch.parent = d;
                locateRecursive(ch, id);
            });
        };

    }

    /* expand current nodes collapsed parents */
    function expandParents(d) {
        while (d.parent) {
            d = d.parent;
            if (!d.children) {
                d.children = d._children;
                d._children = null;
                setToggleSymbol(d, attrs.COLLAPSE_SYMBOL);
            }

        }
    }

    function toggleFullScreen() {

        if ((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen)) {
            if (document.documentElement.requestFullScreen) {
                document.documentElement.requestFullScreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullScreen) {
                document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
            d3.select(params.selector + ' svg').attr('width', screen.width).attr('height', screen.height);
        } else {
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
            d3.select(params.selector + ' svg').attr('width', params.chartWidth).attr('height', params.chartHeight);
        }

    }



    function JSONdownload() {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(circularRemovedNode);
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "data.json");
        dlAnchorElem.click();

    }

    //locateRecursive
    function locate(id) {
        /* collapse all and expand logged user nodes */
        if (!attrs.root.children) {
            if (!attrs.root.uniqueIdentifier == id) {
                attrs.root.children = attrs.root._children;
            }
        }
        if (attrs.root.children) {
            attrs.root.children.forEach(collapse);
            attrs.root.children.forEach(function (ch) {
                locateRecursive(ch, id)
            });
        }

        update(attrs.root, {
            locate: id
        });
    }


    function deepClone(item) {
        return JSON.parse(JSON.stringify(item));
    }

    function show(selectors) {
        display(selectors, 'initial')
    }

    function hide(selectors) {
        display(selectors, 'none')
    }

    function display(selectors, displayProp) {
        selectors.forEach(function (selector) {
            var elements = getAll(selector);
            elements.forEach(function (element) {
                element.style.display = displayProp;
            })
        });
    }

    function set(selector, value) {
        var elements = getAll(selector);
        elements.forEach(function (element) {
            element.innerHTML = value;
            element.value = value;
        })
    }

    function clear(selector) {
        set(selector, '');
    }

    function get(selector) {
        return document.querySelector(selector);
    }

    function getAll(selector) {
        return document.querySelectorAll(selector);
    }

    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    };
    var overCircle = function (d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function (d) {
        selectedNode = null;
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function () {
        var data = [];
        // console.log('draggingNode', draggingNode, "selectedNode", selectedNode)
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.x0,
                    y: selectedNode.y0
                },
                target: {
                    x: draggingNode.x0,
                    y: draggingNode.y0
                }
            }];
        }
        // console.log("data-d",data)
        var link = svg.selectAll(".templink").data(data);
        // debugger;
        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };



}
