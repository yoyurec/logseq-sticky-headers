import '@logseq/libs';
import styles from '../css/stickyHeaders.css';

const headersWrapperSelector = `#main-content-container .page-blocks-inner .ls-block:not([haschild='']):not([data-collapsed]):not([data-refs-self='["quote"]']):not([data-refs-self='["card"]']):not(.pre-block)`;
const headersSelector = ':is(h1, h2, h3, h4, h5)';

let doc: Document;
let root: HTMLElement;
let mainContentContainer: HTMLElement | null;
let intersectionTop: number;

let headersMutationObserver: MutationObserver, headersMutationObserverConfig: MutationObserverInit;
let headersIntersectObserver: IntersectionObserver, headersIntersectObserverConfig: IntersectionObserverInit;

const initHeadersMutationObserver = () => {
    headersMutationObserverConfig = { childList: true, subtree: true };
    headersMutationObserver = new MutationObserver(headersMutationCallback);
}
const headersMutationCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
        const addedNode = mutationsList[i].addedNodes[0] as HTMLElement;
        const removedNode = mutationsList[i].removedNodes[0] as HTMLElement;
        if (addedNode && addedNode.childNodes.length) {
            const header = addedNode.querySelector(headersSelector);
            if (header) {
                console.log('header added');
                const block = header.closest(`.ls-block:not([haschild=''])`);
                if (block) {
                    initHeaders([block]);
                }
            }
        }
        if (
            (addedNode && addedNode.classList && addedNode.classList.contains('lsp-iframe-sandbox-container'))
            || (removedNode && removedNode.classList && removedNode.classList.contains('lsp-iframe-sandbox-container'))
        ) {
            console.log(`StickyHeaders: plugin status change detected`);
            setTimeout(() => {
                reLoad();
            }, 5000);
        }
    }
}
const runHeadersMutationObserver = () => {
    if (!mainContentContainer) {
        return;
    }
    headersMutationObserver.observe(doc.body, headersMutationObserverConfig);
}

const initHeadersIntersectObserver = () => {
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

const initHeaders = (blocksList: NodeListOf<Element> | Element[]) => {
    for (let i = 0; i < blocksList.length; i++) {
        const blockItem = blocksList[i] as HTMLElement;
        if (blockItem) {
            const headerHolder = blockItem.firstChild as Element;
            if (headerHolder.querySelector(headersSelector)) {
                blockItem.classList.add('will-stick');
                headersIntersectObserver.observe(headerHolder);
            }
        }

    }
}

const uninitHeaders = () => {
    const headersList = doc.querySelectorAll('.will-stick');
    for (let i = 0; i < headersList.length; i++) {
        const headerItem = headersList[i] as HTMLElement;
        headerItem.classList.remove('will-stick');
        headerItem.classList.remove('is-sticky');
    }
}

const headersLoad = () => {
    setTimeout(() => {
        const headersList = doc.querySelectorAll(headersWrapperSelector);
        calcDimensions();
        initHeadersIntersectObserver();
        initHeaders(headersList);
        runHeadersMutationObserver();
    }, 5000);
}

const headersUnload = () => {
    headersMutationObserver.disconnect();
}

const reLoad = () => {
    uninitHeaders();
    setTimeout(() => {
        headersIntersectObserver.disconnect();
        calcDimensions();
        initHeadersIntersectObserver();
        const headersList = doc.querySelectorAll(headersWrapperSelector);
        initHeaders(headersList);
    }, 5000);
}

const getDOMContainers = () => {
    doc = parent.document;
    root = doc.documentElement;
    mainContentContainer = doc.getElementById('main-content-container');
}

const calcDimensions = () => {
    let stickyTop = 0;
    let tabsHeight = 0;
    let mainContentContainerPTop = 0;
    let compensateTop = 0;
    if (doc.body.classList.contains('is-solext') || doc.body.classList.contains('is-awesomeUI')) {
        compensateTop = doc.getElementById('head')?.getBoundingClientRect().height || 0;
    }
    if (mainContentContainer) {
        mainContentContainerPTop = parseInt(getComputedStyle(mainContentContainer).paddingTop, 10);
        const tabs = doc.getElementById('logseq-tabs_iframe');
        if (tabs) {
            tabsHeight = tabs.getBoundingClientRect().height;
        }
        intersectionTop = mainContentContainerPTop - tabsHeight - compensateTop;
        stickyTop = intersectionTop * (-1) - 1;
    }
    root.style.setProperty('--sticky-headers-top', `${stickyTop}px`);
}

// Main logseq on ready
const main = async () => {
    console.log(`StickyHeaders: plugin loaded`);

    logseq.provideStyle(styles);

    getDOMContainers();
    initHeadersMutationObserver();

    headersLoad();

    setTimeout(() => {
        logseq.App.onThemeChanged(() => {
            reLoad();
        });
        logseq.App.onThemeModeChanged(() => {
            reLoad();
        });
        logseq.beforeunload(async () => {
            headersUnload();
        });
    }, 3000)

};

logseq.ready(main).catch(console.error);
