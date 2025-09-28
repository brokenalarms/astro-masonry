class MasonryLayout {
  container;
  originalItems;
  defaultCols = 2;
  sortByHeight;
  horizontalOrder;
  breakpointCols;
  columnCount;
  resizeHandler;
  debug;

  constructor(container) {
    this.container = container;
    this.originalItems = Array.from(container.children);
    this.defaultCols = 2;
    this.sortByHeight = container.dataset.sortByHeight === "true";
    this.horizontalOrder = container.dataset.horizontalOrder === "true";
    this.debug = container.dataset.debug === "true";

    // Parse the `breakpointCols` from the dataset
    const breakpointColsAttr = container.dataset.breakpointCols;
    try {
      const parsed = JSON.parse(breakpointColsAttr);
      this.breakpointCols =
        typeof parsed === "object"
          ? parsed
          : { default: parseInt(parsed, 10) };
    } catch (error) {
      console.error("Invalid `breakpointCols` format:", breakpointColsAttr);
      this.breakpointCols = { default: this.defaultCols }; // Fallback
    }

    if (this.debug) {
      console.log("Parsed breakpointCols:", this.breakpointCols);
    }
      
    this.columnCount = this.calculateColumnCount();

    this.resizeHandler = throttle(this.handleResize.bind(this), 200);
    window.addEventListener("resize", this.resizeHandler);

    requestAnimationFrame(() => this.createLayout());
  }

  createLayout() {
    this.container.classList.remove("initialized");
    const existingColumns = Array.from(
      this.container.querySelectorAll("[data-masonry-column]")
    );

    let columns;

    // If column count hasn't changed, reuse existing columns
    if (existingColumns.length === this.columnCount) {
      columns = existingColumns;
      // Just clear existing columns
      columns.forEach((column) => (column.innerHTML = ""));
    } else {
      // Create new columns if count changed
      this.container.innerHTML = "";
      columns = Array.from({ length: this.columnCount }, () => {
        const column = document.createElement("div");
        column.className = this.container.dataset.columnClass;
        column.style.width = `${100 / this.columnCount}%`;
        column.setAttribute("data-masonry-column", "");
        this.container.appendChild(column);
        return column;
      });
    }

    // Distribute items based on sortByHeight or horizontalOrder
    if (this.sortByHeight) {
      this.originalItems.forEach((item) => {
        const columnWithLeastHeight = columns.reduce((shortest, current) => {
          return current.offsetHeight < shortest.offsetHeight
            ? current
            : shortest;
        }, columns[0]);
        columnWithLeastHeight.appendChild(item);
      });
    } else if (this.horizontalOrder) {
      // For horizontal order, fill columns evenly by distributing items sequentially
      // This maintains the original order while balancing column heights
      this.originalItems.forEach((item, index) => {
        const columnWithFewestItems = columns.reduce((shortest, current) => {
          return current.children.length < shortest.children.length
            ? current
            : shortest;
        }, columns[0]);
        columnWithFewestItems.appendChild(item);
      });
    } else {
      this.originalItems.forEach((item, index) => {
        const columnIndex = index % this.columnCount;
        columns[columnIndex].appendChild(item);
      });
    }

    this.container.classList.add("initialized");
  }

  calculateColumnCount() {
    const windowWidth = window.innerWidth;

    if (typeof this.breakpointCols === "object") {
      const breakpoints = Object.keys(this.breakpointCols)
        .filter((key) => key !== "default")
        .map(Number)
        .sort((a, b) => a - b); // Sort breakpoints in ascending order

      let matchedBreakpoint = this.breakpointCols.default; // Start with default
      for (const breakpoint of breakpoints) {
        if (windowWidth <= breakpoint) {
          matchedBreakpoint = this.breakpointCols[breakpoint];
          if (this.debug) {
            console.log(
              `Matched breakpoint: ${breakpoint}px -> ${matchedBreakpoint} columns`
            );
          }
          break; // Stop once the smallest matching breakpoint is found
        }
      }
      return matchedBreakpoint;
    }

    return this.breakpointCols.default || this.defaultCols;
  }

  handleResize() {
    const newColumnCount = this.calculateColumnCount();

    if (newColumnCount !== this.columnCount) {
      if (this.debug) {
        console.log(
          "Resizing: Changing column count from",
          this.columnCount,
          "to",
          newColumnCount
        );
      }
      this.columnCount = newColumnCount;
      this.createLayout();
    }
  }
}

export function initializeMasonry() {
  document
    .querySelectorAll("[data-masonry-container]")
    .forEach((container) => {
      if (container instanceof HTMLElement && container.children.length > 0) {
        new MasonryLayout(container);
      }
    });
}

export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return (...args) => {
    const now = Date.now();
    if (!lastRan) {
      func.apply(this, args);
      lastRan = now;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (now - lastRan >= limit) {
            func.apply(this, args);
            lastRan = now;
          }
        },
        limit - (now - lastRan)
      );
    }
  };
}