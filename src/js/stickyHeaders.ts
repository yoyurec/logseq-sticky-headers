import '@logseq/libs';
import styles from '../css/stickyHeaders.css';

const headersWrapperSelector = `.page-blocks-inner > div > div > div > div > div > div > .ls-block:not([haschild='']):not([data-refs-self='["quote"]']):not([data-refs-self='["card"]']):not(.pre-block) > .flex-row`;
const headersSelector = ':is(h1, h2, h3, h4, h5)';

let doc: Document;
let root: HTMLElement;
let tabs: HTMLElement | null;
let mainContentContainer: HTMLElement | null;
let intersectionTop: number;

let headersMutationObserver: MutationObserver, headersMutationObserverConfig: MutationObserverInit;
let headersIntersectObserver: IntersectionObserver, headersIntersectObserverConfig: IntersectionObserverInit;

const headersMutationCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
        const addedNode = mutationsList[i].addedNodes[0] as HTMLElement;
        if (addedNode && addedNode.childNodes.length) {
            const headersList = addedNode.querySelectorAll(headersWrapperSelector);
            if (headersList.length) {
                initHeaders(headersList);
            }
        }
    }
}

const initHeaders = (headersList: NodeListOf<Element>) => {
    for (let i = 0; i < headersList.length; i++) {
        const headerItem = headersList[i] as HTMLElement;
        if (headerItem && headerItem.querySelector(headersSelector)) {
            headerItem.classList.add('will-stick');
            attachHeadersIntersectObserver(headerItem);
        }
    }
}

const initHeadersMutationObserver = () => {
    headersMutationObserverConfig = { childList: true, subtree: true };
    headersMutationObserver = new MutationObserver(headersMutationCallback);
}

const runHeadersMutationObserver = () => {
    if (!mainContentContainer) {
        return;
    }
    headersMutationObserver.observe(mainContentContainer, headersMutationObserverConfig);
}

const attachHeadersIntersectObserver = (el: HTMLElement) => {
    headersIntersectObserverConfig = {
        root: mainContentContainer,
        rootMargin: `${intersectionTop}px 0px 0px 0px`,
        threshold: [1]
    };
    const headersIntersectCallback: IntersectionObserverCallback = (entryList) => {
        for (let i = 0; i < entryList.length; i++) {
            const entryItem = entryList[i];
            const header = entryItem.target.querySelector(headersSelector);
            if (header) {
                const doToggle = (entryItem.boundingClientRect.top < entryItem.intersectionRect.top) && (entryItem.intersectionRatio < 1);
                entryItem.target.classList.toggle('is-sticky', doToggle);
            }
        }
    }
    headersIntersectObserver = new IntersectionObserver(headersIntersectCallback, headersIntersectObserverConfig);
    headersIntersectObserver.observe(el);
}

const headersLoad = () => {
    setTimeout(() => {
        const headersList = doc.querySelectorAll(headersWrapperSelector);
        calcDimensions();
        initHeaders(headersList);
        runHeadersMutationObserver();
    }, 5000);
}

const headersUnload = () => {
    headersMutationObserver.disconnect();
}

const getDOMContainers = () => {
    doc = parent.document;
    root = doc.documentElement;
    mainContentContainer = doc.getElementById('main-content-container');
    tabs = doc.getElementById('logseq-tabs_iframe');
}

const calcDimensions = () => {
    let stickyTop = 0;
    let tabsHeight = 0;
    let mainContentContainerPTop = 0;
    let compensateTop = 0;
    if (doc.body.classList.contains('is-solext')) {
        doc.querySelector(`[data-injected-style="tabs--top-padding-logseq-tabs"]`)?.remove();
        compensateTop = 48;
    }

    if (mainContentContainer) {
        mainContentContainerPTop = parseInt(getComputedStyle(mainContentContainer).paddingTop, 10);
        if (tabs) {
            tabsHeight = tabs.getBoundingClientRect().height;
        }
        intersectionTop = mainContentContainerPTop - tabsHeight - compensateTop;
        console.log('intersectionTop:', intersectionTop);
        stickyTop = intersectionTop * (-1) - 1;
    }
    root.style.setProperty('--sticky-headers-top', `${stickyTop}px`);
}

// const reInit = () => {
//     console.log('REINIT!!!!');
//     headersIntersectObserver.disconnect();
//     setTimeout(() => {
//         headersLoad();
//     }, 2000)
// }

// Main logseq on ready
const main = async () => {
    console.log(`StickyHeaders: plugin loaded`);

    logseq.provideStyle(styles);

    getDOMContainers();
    initHeadersMutationObserver();

    headersLoad();

    setTimeout(() => {
        logseq.beforeunload(async () => {
            headersUnload();
        });
        // logseq.App.onThemeChanged(() => {
        //     reInit();
        // });
        // logseq.App.onThemeModeChanged(() => {
        //     reInit();
        // });
    }, 3000)

};

logseq.ready(main).catch(console.error);
