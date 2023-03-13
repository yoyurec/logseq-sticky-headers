import '@logseq/libs';
import { logseq as PL } from '../../package.json';

import '../css/stickyHeaders.css';

const headersWrapperSelector = `#main-content-container .page-blocks-inner .ls-block:not([haschild='']):not([data-refs-self='["quote"]']):not([data-refs-self='["card"]']):not(.pre-block)`;
const headersSelector = ':is(h1, h2, h3, h4, h5)';

let doc: Document;
let root: HTMLElement;
let mainContentContainer: HTMLElement | null;
let intersectionTop: number;

let headersMutationObserver: MutationObserver, headersMutationObserverConfig: MutationObserverInit;
let headersIntersectObserver: IntersectionObserver, headersIntersectObserverConfig: IntersectionObserverInit;

const initHeadersMutationObserver = async () => {
    headersMutationObserverConfig = { childList: true, subtree: true };
    headersMutationObserver = new MutationObserver(headersMutationCallback);
}

const headersMutationCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
        const addedNode = mutationsList[i].addedNodes[0] as HTMLElement;
        if (addedNode && addedNode.nodeType !== Node.TEXT_NODE && addedNode.classList.contains('flex') && addedNode.classList.contains('flex-row')) {
            const block = addedNode.closest(`.ls-block`)?.closest(`.ls-block:not([haschild=''])`);
            if (block && !block.classList.contains('will-stick')) {
                const headerInside = (block.firstChild as Element)?.querySelector(headersSelector);
                if (headerInside) {
                    initHeaders([block]);
                }
            }
        }
    }
}

const runHeadersMutationObserver = () => {
    if (!mainContentContainer) {
        return;
    }
    headersMutationObserver.observe(mainContentContainer, headersMutationObserverConfig);
}

const initHeadersIntersectObserver = () => {
    calcDimensions();

    headersIntersectObserverConfig = {
        root: mainContentContainer,
        rootMargin: `${intersectionTop}px 0px 0px 0px`,
        threshold: [1]
    };
    headersIntersectObserver = new IntersectionObserver(headersIntersectCallback, headersIntersectObserverConfig);
}

const headersIntersectCallback: IntersectionObserverCallback = (entryList) => {
    for (let i = 0; i < entryList.length; i++) {
        const entryItem = entryList[i];
        const header = entryItem.target.querySelector(headersSelector);
        if (header) {
            const doToggle = (entryItem.intersectionRatio < 1) && (entryItem.boundingClientRect.top < entryItem.intersectionRect.top);
            entryItem.target.classList.toggle('is-sticky', doToggle);
        }
    }
}

const initHeaders = (blocksList?: NodeListOf<Element> | Element[]) => {
    if (!blocksList) {
        blocksList = doc.querySelectorAll(headersWrapperSelector);
    }
    if (!blocksList) {
        return;
    }
    for (let i = 0; i < blocksList.length; i++) {
        const blockItem = blocksList[i] as HTMLElement;
        if (blockItem) {
            const headerWrapper = blockItem.firstChild as Element;
            if (headerWrapper.querySelector(headersSelector)) {
                blockItem.classList.add('will-stick');
                headersIntersectObserver.observe(headerWrapper);
            }
        }
    }
}

const uninitHeaders = () => {
    headersIntersectObserver.disconnect();
    const blocksList = doc.querySelectorAll('.will-stick');
    for (let i = 0; i < blocksList.length; i++) {
        const blockItem = blocksList[i] as HTMLElement;
        const headerWrapper = blockItem.firstChild as Element;
        blockItem.classList.remove('will-stick');
        headerWrapper.classList.remove('is-sticky');
    }
}

const headersUnload = () => {
    headersMutationObserver.disconnect();
}

const calcDimensions = () => {
    let stickyTop = 0;
    let mainContentContainerPTop = 0;
    if (mainContentContainer) {
        mainContentContainerPTop = parseInt(getComputedStyle(mainContentContainer).paddingTop, 10);
        intersectionTop = mainContentContainerPTop;
        stickyTop = intersectionTop * (-1) - 1;
    }
    root.style.setProperty('--sticky-headers-top', `${stickyTop}px`);
}

const getDOMContainers = async () => {
    doc = parent.document;
    root = doc.documentElement;
    mainContentContainer = doc.getElementById('main-content-container');
}

const registerPlugin = async () => {
    const pluginID = PL.id;
    if (doc.head) {
        doc.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" id="css-awesomeLinks" href="lsp://logseq.io/${pluginID}/dist/assets/stickyHeaders.css">`)
    }
}

const runStuff = async () => {
    setTimeout(() => {
        initHeadersIntersectObserver();
        initHeaders();
        initHeadersMutationObserver();
        runHeadersMutationObserver();
    }, 5000);
}

const reLoad = () => {
    uninitHeaders();
    setTimeout(() => {
        initHeadersIntersectObserver();
        initHeaders();
    }, 1000);
}

const onRouteChangedCallback = () => {
    headersMutationObserver.disconnect();
    setTimeout(() => {
        initHeaders();
        runHeadersMutationObserver();
    }, 1000);
}

const runListeners = async () => {
    setTimeout(() => {
        logseq.App.onRouteChanged(() => {
            onRouteChangedCallback();
        });
        logseq.App.onThemeChanged(() => {
            reLoad();
        });
        logseq.App.onThemeModeChanged(() => {
            reLoad();
        });
        logseq.beforeunload(async () => {
            headersUnload();
        });
    }, 5000)
}

// Main logseq on ready
const main = async () => {
    console.log(`StickyHeaders: plugin loaded`);
    getDOMContainers();
    registerPlugin();
    runStuff();
    runListeners();
};

logseq.ready(main).catch(null);