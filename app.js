const tilesetPath = "ChestHole32Tileset";

class Application extends React.Component {
    constructor(props) {
        super(props);

        this.tileComponents = this.props.tiles.map(t => ({
            t, sprite: (<Sprite tile={t}/>)
        }));

        this.state = {
            filter: ''
        };

        this.handleSubmit = (newValue) => {
            console.log(newValue);
            this.setState({filter: newValue});
        };
    }

    render() {
        const f = this.state.filter;
        console.log(`filter: ${f}`);
        console.log('head tile:', this.tileComponents[0]);

        const visible = (t) => !f || t.id.indexOf(f) !== -1 || t.bg == f || t.fg == f;
        const filtered = this.tileComponents.filter(({t}) => visible(t));

        return [
            <SearchForm key="search-form" handleSubmit={this.handleSubmit}/>,
            <div className="container-fluid" key="container">
                <div className="row">
                    <ReactVirtualized.WindowScroller>
                        {({height, isScrolling, onChildScroll, scrollTop}) => (
                            <ReactVirtualized.List
                                className="col"
                                rowRenderer={({key, index, style}) =>
                                    <div key={key} style={style} className="row align-items-center">
                                        {filtered[index].sprite}
                                    </div>}
                                autoHeight
                                height={height}
                                isScrolling={isScrolling}
                                onScroll={onChildScroll}
                                scrollTop={scrollTop}
                                rowCount={filtered.length}
                                rowHeight={({index}) => filtered[index].t.sprite_height + 20}
                                estimatedRowSize={32}
                                width={10000}
                            />
                        )}
                    </ReactVirtualized.WindowScroller>
                </div>
            </div>
        ]
    }
}


class SearchForm extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <nav className="navbar navbar-light bg-light sticky-top">
            <form className="form-inline" onSubmit={(e) => {
                this.props.handleSubmit(this.inputDOM.value);
                e.preventDefault();
            }}>
                <div className="form-group">
                    <label htmlFor="form-filter" className="sr-only">Filter</label>
                    <input type="text" className="form-control" id="form-filter"
                           placeholder="Filter..." ref={_ => this.inputDOM = _}/>
                </div>
            </form>
        </nav>
    }
}

class Sprite extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const t = this.props.tile;
        const w = t.sprite_width;
        const h = t.sprite_height;
        const commonSpriteProps = {
            imageWidth: t.file_dimensions.w,
            imageHeight: t.file_dimensions.h,
            spriteOffset: t.sprite_offset,
            file: t.file,
            w, h
        };

        return <React.Fragment>
            <div className='col-sm-auto'>
                <div style={{width: `${w * 2}px`}}>
                    {t.fg && <SpriteImage spriteId={t.fg} {...commonSpriteProps} />}
                    {t.bg && <SpriteImage spriteId={t.bg} {...commonSpriteProps} />}
                </div>
            </div>
            <div className='col-lg'>
                {t.id}
            </div>
            <div className='col-sm'>
                {t.file}
            </div>
        </React.Fragment>
    }
}

class SpriteImage extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const w = this.props.w;
        const h = this.props.h;
        const {x, y} = spriteIdToXY(
            this.props.spriteId - this.props.spriteOffset,
            w,
            h,
            this.props.imageWidth,
            this.props.imageHeight
        );

        return <div style={{
            display: 'inline-block',
            position: 'relative',
            backgroundImage: 'url(' + tilesetPath + "/" + this.props.file + ')',
            backgroundPosition: `${-x}px ${-y}px`,
            width: `${w}px`,
            height: `${h}px`,
            overflow: "show",
            border: '1px solid black'
        }} title={`id:${this.props.spriteId} x:${x}, y:${y}`}>
            <div className="badge badge-dark" style={{
                position: 'absolute',
                bottom: '-1.5em',
                right: '0',
                fontSize: 'xx-small'
            }}>{this.props.spriteId}</div>
        </div>

    }
}

function spriteIdToXY(spriteId, spriteW, spriteH, imageW, imageH) {
    const imageSpritesW = Math.floor(imageW / spriteW);
    const imageSpritesH = Math.floor(imageH / spriteH);

    return {
        x: (spriteId - Math.floor(spriteId / imageSpritesW) * imageSpritesW) * spriteW /*x*/,
        y: (Math.floor(spriteId / imageSpritesW) % imageSpritesH) * spriteH /*y*/
    };
}

function toArray(obj) {
    return Array.isArray(obj) ? obj : [obj];
}

function flatten(arr) {
    return arr.reduce(
        (acc, cur) => acc.concat(cur),
        []
    );
}

function parseTiles(data) {
    const globalDefaults = data.tile_info[0];
    const tn = data["tiles-new"];

    const readTs = (ts) => {
        const defaults =
            (({file, sprite_width, sprite_height}) => ({
                file,
                sprite_width: (sprite_width || globalDefaults.width),
                sprite_height: (sprite_height || globalDefaults.height)
            }))(ts);

        return flatten((ts.tiles || []).map((tile) =>
            toArray(tile.id).map(id => {
                    const res = Object.assign({}, defaults, tile, {id});
                    if (res.fg && Array.isArray(res.fg)) {
                        res.fg = res.fg[0].sprite;
                    }
                    return res;
                }
            )
        ));
    };

    var tiles = [];
    for (const k in tn) {
        if (tn.hasOwnProperty(k) && tn[k].tiles) {
            tiles = tiles.concat(readTs(tn[k]));
        }
    }
    return tiles;
}

function loadImageDimensions(tiles, cb) {
    const images = {};
    for (const t of tiles) {
        if (t.file) images[t.file] = null;
    }

    for (const f in images) {
        if (images.hasOwnProperty(f)) {
            const img = new Image();
            img.onload = function () {
                images[f] = {w: this.width, h: this.height};
                for (const f in images) {
                    if (images.hasOwnProperty(f) && !images[f]) return;
                }
                cb(images)
            }
            img.src = `${tilesetPath}/${f}`;
        }
    }
}

$.get(tilesetPath + "/tile_config.json", (data) => {
    const tiles = parseTiles(data);

    loadImageDimensions(tiles, function (img) {
        const usedImages = {};
        let cumOffset = 0;
        let curOffset = 0;
        for (const t of tiles) {
            if (t.file && img[t.file]) {
                if (!usedImages[t.file]) {
                    usedImages[t.file] = true;
                    cumOffset += curOffset;
                    curOffset = Math.floor(img[t.file].w / t.sprite_width * img[t.file].h / t.sprite_height);
                }
                t.file_dimensions = img[t.file];
                t.sprite_offset = cumOffset;
            }
        }

        ReactDOM.render((
            <Application tiles={tiles}/>
        ), document.getElementsByTagName('body')[0]);
    });
})