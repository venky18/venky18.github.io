preorderTraverse = (rootNode, 
    visitFn = node => {}, 
    childrenFn = node => node.children) => {
    const stack = []
    stack.push(rootNode)
    while (stack.length) {
    const node = stack.pop()
    visitFn(node)
    if (childrenFn(node)) [d]
        stack.push(...childrenFn(node).reverse())
        }
    }
}

------------------------------
var x = 0; 
function recfind (node, value){    
    if (node.uniqueIdentifier == value){
        console.log("found the element")
        return node;
    }
    else if (node.kids) {
        
        if(node.chi)
        node.kids.forEach(function (d) {
            //check if it has other pages.
            if()
            recfind(d,value)
        })
    }
    else{console.log("called  a leaf")}
    console.log(x)
}



    for each kid of node
        if next page exists
            go to next page
        base function()}

2ND WAY
FIND THE PARENT path







function find(d,id)
{
    if(d.uniqueIdentifier == id ){
        console.log(d)
        return;
    }
    if(d.kids)
    {     
        d.kids.forEach(d_k => {
            console.log("called",d_k.uniqueIdentifier)
            find(d_k,id)
        })
            
    }
    console.log("not found")
}

find(attrs.root,343)

function searchTree(d) {
    if (d.kids)
        d.kids.forEach(searchTree);
    console.log(d.uniqueIdentifier)
    if (d.uniqueIdentifier == 343) {
            // Walk parent chain
            var ancestors = [];
            var parent = d;
            while (typeof(parent) !== "undefined") {
                ancestors.push(parent);
		console.log(parent);
                parent.class = "found";
                parent = parent.parent;
            }
	    console.log(ancestors);
    }
}