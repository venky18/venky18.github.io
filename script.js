function drawOrganizationChart(params) {
    listen();
    console.log(params)
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

    // connstant needs to be updated as data changes
    //
    var OrgTypesLevel1 = ['IDN'];
    var OrgTypesLevel2 = ['IDN_Filled', 'OSUB'];
    var OrgTypesLevel3 = ['IDN_Filled', 'HOSP', 'OSUB_Filled'];
    var OrgTypesLevel4 = ['CLIN', 'PHAR', 'INDP', 'WHOL', 'UNSPEC', 'CLIN', 'RC', 'PAYR', 'INDP', 'PHAR', 'HMHLT', 'HOSP_Filled'];
    var OrgTypesLevel5 = ['OUTLET'];
    var RelationSubtypeColors = {
        "Filled": "#2d3436",
        "Owned": "#00cec9",
        "Affiliated Purchasing": "#00b894",
        "Managed": "#fdcb6e",
        "Leased": "#d63031",
        "OWNERSHIP": "#e17055",
        "DEPARTMENT": "#81ecec",
        "OUTLET": "#dfe6e9"
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

    var tree = d3.layout.tree().nodeSize([attrs.nodeWidth + 40, attrs.nodeHeight]);
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
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

    if (params.mode != 'department') {
        // adding unique values to each node recursively
        var uniq = 1;
        addPropertyRecursive('uniqueIdentifier', function(v) {

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

   


    function update(source, param) {

        // Compute the new tree layout.
        var nodes = tree.nodes(attrs.root)
            .reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) {
            d.y = d.depth * attrs.linkLineSize;
        });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++attrs.index);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.x0 + "," + source.y0 + ")";
            })

        var nodeGroup = nodeEnter.append("g")
            .attr("class", "node-group")


        nodeGroup.append("rect")
            .attr("width", attrs.nodeWidth)
            .attr("height", attrs.nodeHeight)
            .attr("data-node-group-id", function(d) {
                return d.uniqueIdentifier;
            })
            .attr("class", function(d) {
                var res = "";
                if (d.isLoggedUser) res += 'nodeRepresentsCurrentUser ';
                res += d._children || d.children ? "nodeHasChildren" : "nodeDoesNotHaveChildren";
                return res;
            });

        var collapsiblesWrapper =
            nodeEnter.append('g')
            .attr('data-id', function(v) {
                return v.uniqueIdentifier;
            });

        var collapsibleRects = collapsiblesWrapper.append("rect")
            .attr('class', 'node-collapse-right-rect')
            .attr('height', attrs.collapseCircleRadius)
            .attr('fill', 'black')
            .attr('x', attrs.nodeWidth - attrs.collapseCircleRadius)
            .attr('y', attrs.nodeHeight - 7)
            .attr("width", function(d) {
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
        collapsibles.attr("r", function(d) {
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
            .text(function(d) {
                return d.collapseText;
            })

        collapsiblesWrapper.on("click", click);

        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin)
            .attr("y", attrs.nodePadding + 10)
            .attr('class', 'entity-name')
            .attr("text-anchor", "left")
            .text(function(d) {
                return d.ENTITY_NAME.trim();
            })
            .call(wrap, 180);

        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin)
            .attr("y", dynamic.nodePositionNameTopMargin + 20)
            .attr('class', 'emp-position-name')
            .attr("dy", ".35em")
            .attr("text-anchor", "left")
            .text(function(d) {
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
            .text(function(d) {
                if (d.children || d._children) return attrs.userIcon;
            });

        nodeGroup.append("text")
            .attr("x", dynamic.nodeTextLeftMargin + 13)
            .attr("y", dynamic.nodeChildCountTopMargin)
            .attr('class', 'emp-count')
            .attr("text-anchor", "left")

        .text(function(d) {
            if (d.children) return d.children.length;
            if (d._children) return d._children.length;
            return;
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
            .attr("xlink:href", function(v) {
                // debugger;
                return CheckOrgTypeReturnImage(v)
            })
            // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(attrs.duration)
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })

        //todo replace with attrs object
        nodeUpdate.select("rect")
            .attr("width", attrs.nodeWidth)
            .attr("height", attrs.nodeHeight)
            .attr('rx', 3)
            .attr("stroke", function(d) {
                if (param && d.uniqueIdentifier == param.locate) {
                    return '#a1ceed'
                }
                return attrs.nodeStroke;
            })
            .attr('stroke-width', function(d) {
                if (param && d.uniqueIdentifier == param.locate) {
                    return 6;
                }
                return attrs.nodeStrokeWidth
            })

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(attrs.duration)
            .attr("transform", function(d) {
                return "translate(" + source.x + "," + source.y + ")";
            })
            .remove();

        nodeExit.select("rect")
            .attr("width", attrs.nodeWidth)
            .attr("height", attrs.nodeHeight)

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function(d) {
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
            .attr("stroke", function(d) {
                debugger;
                console.log(RelationSubtypeColors[d.target.REL_TYPE])
                return RelationSubtypeColors[d.target.REL_TYPE]
            })
            // .style("stroke-dasharray", ("3, 3")) 
            .attr("stroke-width", function(d) {
                return "2px"
            })

        .attr("d", function(d) {
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
            .attr("d", function(d) {
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
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        if (param && param.locate) {
            var x;
            var y;

            nodes.forEach(function(d) {
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

            nodes.forEach(function(d) {
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
            return tags.split(',').map(function(v) {
                return '<li><div class="tag">' + v + '</div></li>  '
            }).join('');
        }

        function tooltipContent(item) {

            var strVar = "";
            console.log(item)
            strVar += '<div class="ui card">'
            strVar += '<div class="content">'
            strVar += '<img class="right floated mini ui image" src="https://semantic-ui.com/images/avatar/large/elliot.jpg" style="height:  30px;">'
            strVar += '<div class="header">'+toTitleCase(item.ENTITY_NAME)+'</div>'
            strVar += '<div class="meta">'+item.ENTITY_ORG_TYPE+'</div>'    
            strVar += '<div class="">'+item.ENTITY_ADDR1+", "+item.ENTITY_STATE+", "+item.ENTITY_CITY+", "+item.ENTITY_ZIP+'</div>'
            strVar += '<br>'
            strVar += '<div class="">'+"Relationship"+": "+item.REL_TYPE+"-"+item.REL_SUBTYPE+ '</div>'
            strVar += '<br>'
            strVar += '<div class="">'+"Rep Access"+": "+item.ENTITY_SREP_ACCESS+ '</div>'
            strVar += '</div>'
            strVar += '<div class="extra content">'
            strVar += '<div class="ui small horizontal list">'
            strVar += '<div class="item"><div class="header">'+item.NO_OF_HOSPS+" HOSPS"+'</div></div>'
            strVar += '<div class="item"><div class="header">'+item.NO_OF_OUTLETS+" OUTLETS"+'</div></div>'
            strVar += '<div class="item"><div class="header">'+item.NO_OF_SOCS+" SOCS"+'</div></div>'
            strVar += '<div class="item"><div class="header">'+item.NO_OF_OSUBS+" OSUBS"+'</div></div>'
            strVar += '</div>'
            strVar += '</div>'

            return strVar;

        }

        function tooltipHoverHandler(d) {

            var content = tooltipContent(d);
            tooltip.html(content);

            tooltip.transition()
                .duration(200).style("opacity", "1").style('display', 'block');
            d3.select(this).attr('cursor', 'pointer').attr("stroke-width", 50);

            var y = d3.event.pageY;
            var x = d3.event.pageX;
            debugger;
            //restrict tooltip to fit in borders
            if (y < 220) {
                y += 220 - y;
                x += 130;
            }
            if (x > attrs.width - 300) {
                x -= 300 - (attrs.width - x);
            }

            if (y > attrs.height - 300) {
                y -= 300 - (attrs.height - y);
            }

            tooltip.style('top', (y) + 'px')
                .style('left', (x ) + 'px');
                debugger;
        }

        function tooltipOutHandler() {
            tooltip.transition()
                .duration(200)
                .style('opacity', '0').style('display', 'none');
            d3.select(this).attr("stroke-width", 5);

        }

        nodeGroup.on('click', tooltipHoverHandler);

        nodeGroup.on('dblclick', tooltipOutHandler);

        function equalToEventTarget() {
            return this == d3.event.target;
        }

        d3.select("body").on("click", function() {
            var outside = tooltip.filter(equalToEventTarget).empty();
            if (outside) {
                tooltip.style('opacity', '0').style('display', 'none');
            }
        });

    }

    // Toggle children on click.
    function click(d) {

        d3.select(this).select("text").text(function(dv) {

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

        text.each(function() {
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
            element.children.forEach(function(v) {
                addPropertyRecursive(propertyName, propertyValueFunction, v)
            })
        }
        if (element._children) {
            element._children.forEach(function(v) {
                addPropertyRecursive(propertyName, propertyValueFunction, v)
            })
        }
    }

    // function departmentClick(item) {
    //     hide(['.customTooltip-wrapper']);

    //     if (item.type == 'department' && params.mode != 'department') {
    //         //find third level department head user
    //         var found = false;
    //         var secondLevelChildren = params.pristinaData.children;
    //         parentLoop:
    //             for (var i = 0; i < secondLevelChildren.length; i++) {
    //                 var secondLevelChild = secondLevelChildren[i];
    //                 var thirdLevelChildren = secondLevelChild.children ? secondLevelChild.children : secondLevelChild._children;

    //                 for (var j = 0; j < thirdLevelChildren.length; j++) {
    //                     var thirdLevelChild = thirdLevelChildren[j];
    //                     if (thirdLevelChild.unit.value.trim() == item.value.trim()) {
    //                         clear(params.selector);

    //                         hide(['.btn-action']);
    //                         show(['.btn-action.btn-back', '.btn-action.btn-fullscreen', '.department-information']);
    //                         set('.dept-name', item.value);

    //                         set('.dept-emp-count', "Employees Quantity - " + getEmployeesCount(thirdLevelChild));
    //                         set('.dept-description', thirdLevelChild.unit.desc);

    //                         params.oldData = params.data;

    //                         params.data = deepClone(thirdLevelChild);
    //                         found = true;
    //                         break parentLoop;
    //                     }
    //                 }
    //             }
    //         if (found) {
    //             params.mode = "department";
    //             params.funcs.closeSearchBox();
    //             drawOrganizationChart(params);

    //         }

    //     }
    // }

    function getEmployeesCount(node) {
        var count = 1;
        countChilds(node);
        return count;

        function countChilds(node) {
            var childs = node.children ? node.children : node._children;
            if (childs) {
                childs.forEach(function(v) {
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
        var htmlStringArray = results.map(function(result) {
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

        input.addEventListener('input', function() {
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
            .each("end", function() {
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
                childUsers.forEach(function(childUser) {
                    recursivelyFindIn(childUser, searchText)
                })
            }
        };
    }

    // function back() {

    //     show(['.btn-action']);
    //     hide(['.customTooltip-wrapper', '.btn-action.btn-back', '.department-information'])
    //     clear(params.selector);

    //     params.mode = "full";
    //     params.data = deepClone(params.pristinaData)
    //     drawOrganizationChart(params);

    // }

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
            d._children.forEach(function(ch) {
                ch.parent = d;
                findmySelf(ch);
            })
        } else if (d.children) {
            d.children.forEach(function(ch) {
                ch.parent = d;
                findmySelf(ch);
            });
        };

    }

    function locateRecursive(d, id) {
        if (d.uniqueIdentifier == id) {
            expandParents(d);
        } else if (d._children) {
            d._children.forEach(function(ch) {
                ch.parent = d;
                locateRecursive(ch, id);
            })
        } else if (d.children) {
            d.children.forEach(function(ch) {
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
            attrs.root.children.forEach(function(ch) {
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
        selectors.forEach(function(selector) {
            var elements = getAll(selector);
            elements.forEach(function(element) {
                element.style.display = displayProp;
            })
        });
    }

    function set(selector, value) {
        var elements = getAll(selector);
        elements.forEach(function(element) {
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
            function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }


}


// d3.select('g').attr('transform','translate(-136,134) scale(1)')

// $('.ui.fluid.search.selection.dropdown')
//   .dropdown()
// ;