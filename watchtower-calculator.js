/**
 * 見張り台 必要数・推奨ルート計算
 *
 * ==================================================
 * 座標ルール
 * ==================================================
 *
 * 地域・IRとも共通。
 *
 * 3つの整数座標で1マス。
 *
 * 例：
 *
 * |120-122|123-125|126-128|
 * |567-569|570-572|573-575|
 * |723-725|726-728|729-731|
 *
 * したがって、
 *
 * cell = Math.floor(座標 / 3)
 *
 * で判定できる。
 *
 *
 * ==================================================
 * 見張り台ルール
 * ==================================================
 *
 * ・見張り台1個 = 3×3マス
 *
 * ・最初の見張り台は、
 *   スタート地点の1マス領地と
 *   1辺以上接する必要がある
 *
 * ・角だけの接触は不可
 *
 * ・2個目以降も、
 *   既存の見張り台領地と
 *   1辺以上接する必要がある
 *
 * ・見張り台同士の重なりは可
 *
 * ・目的地は、
 *   見張り台の3×3内に入る、
 *   または辺に接すれば到達
 *
 * ・必要個数は最小数を最優先
 */

(() => {

  "use strict";


  const GRID_SIZE = 3;


  // ==================================================
  // 共通関数
  // ==================================================

  function sign(value) {

    if (
      value > 0
    ) {
      return 1;
    }


    if (
      value < 0
    ) {
      return -1;
    }


    return 0;
  }


  function clamp(
    value,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }


  // ==================================================
  // 座標 → マス
  // ==================================================

  /**
   * 座標からマス番号を取得
   *
   * 例：
   *
   * 147～149 → 49
   * 150～152 → 50
   */
  function coordinateToCellIndex(
    value
  ) {

    return Math.floor(
      value /
      GRID_SIZE
    );
  }


  /**
   * マス番号から代表座標を取得
   *
   * 例：
   *
   * 147～149 → 148
   * 150～152 → 151
   */
  function cellIndexToRepresentative(
    index
  ) {

    return (
      index *
      GRID_SIZE +
      1
    );
  }


  /**
   * 入力座標をマスへ変換
   */
  function normalizePoint(
    x,
    y
  ) {

    const cellX =
      coordinateToCellIndex(
        x
      );


    const cellY =
      coordinateToCellIndex(
        y
      );


    return {

      inputX:
        x,

      inputY:
        y,

      cellX,

      cellY,

      representativeX:
        cellIndexToRepresentative(
          cellX
        ),

      representativeY:
        cellIndexToRepresentative(
          cellY
        ),
    };
  }


  // ==================================================
  // 到達判定
  // ==================================================

  /**
   * スタート地点と目的地が
   * すでに同一マス、
   * または辺で隣接しているか
   */
  function isAlreadyConnected(
    dx,
    dy
  ) {

    return (

      (
        dx === 0 &&
        Math.abs(dy) <= 1
      )

      ||

      (
        dy === 0 &&
        Math.abs(dx) <= 1
      )
    );
  }


  /**
   * 目的地が
   * 見張り台の3×3領地内にあるか
   */
  function towerContainsCell(
    towerX,
    towerY,
    targetX,
    targetY
  ) {

    return (

      Math.abs(
        targetX -
        towerX
      ) <= 1

      &&

      Math.abs(
        targetY -
        towerY
      ) <= 1
    );
  }


  /**
   * 見張り台から目的地へ
   * 到達しているか
   *
   * ・3×3領地内
   * ・辺接触
   */
  function towerReachesCell(
    towerX,
    towerY,
    targetX,
    targetY
  ) {

    const dx =
      Math.abs(
        targetX -
        towerX
      );


    const dy =
      Math.abs(
        targetY -
        towerY
      );


    const inside =
      (
        dx <= 1 &&
        dy <= 1
      );


    const edgeTouch =
      (
        (
          dx === 2 &&
          dy <= 1
        )

        ||

        (
          dy === 2 &&
          dx <= 1
        )
      );


    return (
      inside ||
      edgeTouch
    );
  }


  // ==================================================
  // 建設可能位置
  // ==================================================

  /**
   * 1個目の見張り台候補
   *
   * スタート地点は1マスだけを
   * 所有領地として扱う。
   */
  function getFirstTowerCandidates() {

    const candidates = [];


    for (
      let x = -2;
      x <= 2;
      x++
    ) {

      for (
        let y = -2;
        y <= 2;
        y++
      ) {

        const absX =
          Math.abs(x);


        const absY =
          Math.abs(y);


        const touchesByEdge =
          (

            (
              absX === 2 &&
              absY <= 1
            )

            ||

            (
              absY === 2 &&
              absX <= 1
            )
          );


        if (
          touchesByEdge
        ) {

          candidates.push({
            x,
            y,
          });
        }
      }
    }


    return candidates;
  }


  /**
   * 2個目以降の
   * 見張り台中心の移動候補
   *
   * 最大3マス進める。
   *
   * ただし、
   *
   * 横3・縦3
   *
   * は角と角しか接しないので不可。
   */
  function getTowerMoveDeltas() {

    const moves = [];


    for (
      let dx = -3;
      dx <= 3;
      dx++
    ) {

      for (
        let dy = -3;
        dy <= 3;
        dy++
      ) {

        if (
          dx === 0 &&
          dy === 0
        ) {
          continue;
        }


        const absX =
          Math.abs(dx);


        const absY =
          Math.abs(dy);


        /**
         * 3・3は角接触のみ
         */
        if (
          absX === 3 &&
          absY === 3
        ) {
          continue;
        }


        moves.push({
          x: dx,
          y: dy,
        });
      }
    }


    return moves;
  }


  const FIRST_TOWER_CANDIDATES =
    getFirstTowerCandidates();


  const TOWER_MOVE_DELTAS =
    getTowerMoveDeltas();


  // ==================================================
  // 推奨ルート
  // ==================================================

  /**
   * 主方向を決める。
   *
   * 横と縦が同距離なら
   * 縦方向を優先。
   */
  function getMainAxis(
    dx,
    dy
  ) {

    if (
      Math.abs(dy) >=
      Math.abs(dx)
    ) {

      return "y";
    }


    return "x";
  }


  /**
   * 1個目の理想位置
   *
   * 主方向へ2マス
   * 副方向へ1マス
   */
  function getIdealFirstMove(
    dx,
    dy
  ) {

    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    const sx =
      sign(dx);


    const sy =
      sign(dy);


    if (
      mainAxis === "y"
    ) {

      return {

        x:
          dx === 0
            ? 0
            : sx,

        y:
          sy * 2,
      };
    }


    return {

      x:
        sx * 2,

      y:
        dy === 0
          ? 0
          : sy,
    };
  }


  /**
   * 2個目以降の理想移動
   *
   * 主方向：最大3マス
   * 副方向：最大2マス
   */
  function getIdealNextMove(
    currentX,
    currentY,
    targetX,
    targetY
  ) {

    const remainingX =
      targetX -
      currentX;


    const remainingY =
      targetY -
      currentY;


    const mainAxis =
      getMainAxis(
        targetX,
        targetY
      );


    if (
      mainAxis === "y"
    ) {

      return {

        x:
          clamp(
            remainingX,
            -2,
            2
          ),

        y:
          sign(targetY) * 3,
      };
    }


    return {

      x:
        sign(targetX) * 3,

      y:
        clamp(
          remainingY,
          -2,
          2
        ),
    };
  }


  /**
   * 理想位置からのズレ。
   *
   * 同じ必要個数のルートが
   * 複数ある場合の優先順位に使用。
   */
  function movePenalty(
    actualX,
    actualY,
    idealX,
    idealY
  ) {

    return (

      Math.abs(
        actualX -
        idealX
      )

      +

      Math.abs(
        actualY -
        idealY
      )
    );
  }


  // ==================================================
  // 最短ルート探索
  // ==================================================

  function findShortestRoute(
    targetX,
    targetY
  ) {

    const padding = 6;


    const minX =
      Math.min(
        0,
        targetX
      ) -
      padding;


    const maxX =
      Math.max(
        0,
        targetX
      ) +
      padding;


    const minY =
      Math.min(
        0,
        targetY
      ) -
      padding;


    const maxY =
      Math.max(
        0,
        targetY
      ) +
      padding;


    const idealFirst =
      getIdealFirstMove(
        targetX,
        targetY
      );


    let layer =
      new Map();


    // --------------------------------------------------
    // 1個目
    // --------------------------------------------------

    for (
      const candidate
      of FIRST_TOWER_CANDIDATES
    ) {

      if (
        candidate.x < minX ||
        candidate.x > maxX ||
        candidate.y < minY ||
        candidate.y > maxY
      ) {
        continue;
      }


      const score =
        movePenalty(
          candidate.x,
          candidate.y,
          idealFirst.x,
          idealFirst.y
        );


      const key =
        `${candidate.x},${candidate.y}`;


      const existing =
        layer.get(
          key
        );


      if (
        !existing ||
        score <
        existing.score
      ) {

        layer.set(
          key,
          {

            x:
              candidate.x,

            y:
              candidate.y,

            score,

            path: [
              {
                x:
                  candidate.x,

                y:
                  candidate.y,
              },
            ],
          }
        );
      }
    }


    /**
     * 十分余裕を持った探索上限
     */
    const maxDepth =
      Math.ceil(
        (
          Math.abs(targetX) +
          Math.abs(targetY)
        ) /
        2
      ) +
      20;


    // --------------------------------------------------
    // BFS
    // --------------------------------------------------

    for (
      let depth = 1;
      depth <= maxDepth;
      depth++
    ) {

      const reached = [];


      /**
       * この個数で
       * 目的地に届くか
       */
      for (
        const node
        of layer.values()
      ) {

        if (
          towerReachesCell(
            node.x,
            node.y,
            targetX,
            targetY
          )
        ) {

          reached.push(
            node
          );
        }
      }


      /**
       * 最初に到達したdepthが
       * 最小個数。
       */
      if (
        reached.length > 0
      ) {

        reached.sort(
          (a, b) =>
            a.score -
            b.score
        );


        return {

          count:
            depth,

          route:
            reached[0].path,

          score:
            reached[0].score,
        };
      }


      const nextLayer =
        new Map();


      // ------------------------------------------------
      // 次の塔
      // ------------------------------------------------

      for (
        const node
        of layer.values()
      ) {

        const ideal =
          getIdealNextMove(
            node.x,
            node.y,
            targetX,
            targetY
          );


        for (
          const delta
          of TOWER_MOVE_DELTAS
        ) {

          const nextX =
            node.x +
            delta.x;


          const nextY =
            node.y +
            delta.y;


          if (
            nextX < minX ||
            nextX > maxX ||
            nextY < minY ||
            nextY > maxY
          ) {
            continue;
          }


          const nextScore =
            node.score +
            movePenalty(
              delta.x,
              delta.y,
              ideal.x,
              ideal.y
            );


          const key =
            `${nextX},${nextY}`;


          const existing =
            nextLayer.get(
              key
            );


          if (
            !existing ||
            nextScore <
            existing.score
          ) {

            nextLayer.set(
              key,
              {

                x:
                  nextX,

                y:
                  nextY,

                score:
                  nextScore,

                path: [
                  ...node.path,

                  {
                    x:
                      nextX,

                    y:
                      nextY,
                  },
                ],
              }
            );
          }
        }
      }


      layer =
        nextLayer;
    }


    throw new Error(
      "最短ルートを探索できませんでした。"
    );
  }


  // ==================================================
  // 方向関連
  // ==================================================

  function getDirectionInfo(
    dx,
    dy
  ) {

    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    let mainDirection;


    if (
      mainAxis === "y"
    ) {

      mainDirection =
        dy > 0
          ? "上"
          : "下";

    } else {

      mainDirection =
        dx > 0
          ? "右"
          : "左";
    }


    let sideDirection =
      null;


    if (
      mainAxis === "y"
    ) {

      if (
        dx > 0
      ) {

        sideDirection =
          "右";

      } else if (
        dx < 0
      ) {

        sideDirection =
          "左";
      }

    } else {

      if (
        dy > 0
      ) {

        sideDirection =
          "上";

      } else if (
        dy < 0
      ) {

        sideDirection =
          "下";
      }
    }


    return {

      mainAxis,

      mainDirection,

      sideDirection,
    };
  }


  function getAxisDirection(
    axis,
    dx,
    dy
  ) {

    if (
      axis === "x"
    ) {

      if (
        dx > 0
      ) {
        return "右";
      }


      if (
        dx < 0
      ) {
        return "左";
      }


      return null;
    }


    if (
      dy > 0
    ) {
      return "上";
    }


    if (
      dy < 0
    ) {
      return "下";
    }


    return null;
  }


  // ==================================================
  // 最初の建設位置
  // ==================================================

  function buildStartInstruction(
    dx,
    dy
  ) {

    const {

      mainAxis,

      mainDirection,

      sideDirection,

    } =
      getDirectionInfo(
        dx,
        dy
      );


    let positionText;


    if (
      sideDirection === null
    ) {

      if (
        mainAxis === "y"
      ) {

        positionText =
          mainDirection === "上"
            ? "真上"
            : "真下";

      } else {

        positionText =
          "真横";
      }

    } else {

      positionText =
        `やや${sideDirection}寄り`;
    }


    return (

      `スタート地点の` +

      `【強調】${mainDirection}側の辺【/強調】` +

      `に接するように、` +

      `【強調】${positionText}【/強調】` +

      `から建設してください。`
    );
  }


  // ==================================================
  // 最終見張り台の余裕
  // ==================================================

  /**
   * 最終見張り台から見て、
   * 目的地がさらに目的地方向へ
   * 何マス動けるかを計算。
   *
   * 目的地が3×3内にある場合：
   *   3×3の端までを「余裕」とする。
   *
   * 目的地が辺接触の場合：
   *   現在の到達条件を保てる範囲で判定。
   */
  function getSlackForAxis(
    finalTower,
    targetX,
    targetY,
    axis,
    direction
  ) {

    const baseInside =
      towerContainsCell(
        finalTower.x,
        finalTower.y,
        targetX,
        targetY
      );


    let slack = 0;


    for (
      let extra = 1;
      extra <= 3;
      extra++
    ) {

      let testX =
        targetX;


      let testY =
        targetY;


      if (
        axis === "x"
      ) {

        testX +=
          direction *
          extra;

      } else {

        testY +=
          direction *
          extra;
      }


      let possible;


      /**
       * 現在目的地が3×3内なら、
       * 余裕は3×3内だけで数える。
       */
      if (
        baseInside
      ) {

        possible =
          towerContainsCell(
            finalTower.x,
            finalTower.y,
            testX,
            testY
          );

      } else {

        /**
         * 現在が辺接触の場合は
         * 到達可能範囲で判定。
         */
        possible =
          towerReachesCell(
            finalTower.x,
            finalTower.y,
            testX,
            testY
          );
      }


      if (
        !possible
      ) {
        break;
      }


      slack =
        extra;
    }


    return slack;
  }


  /**
   * 推奨ルートの最後の塔を基準に
   * X/Yの余裕を求める。
   */
  function calculateRouteSlack(
    dx,
    dy,
    route
  ) {

    const finalTower =
      route[
        route.length - 1
      ];


    let xSlack =
      null;


    let ySlack =
      null;


    if (
      dx !== 0
    ) {

      xSlack =
        getSlackForAxis(
          finalTower,
          dx,
          dy,
          "x",
          sign(dx)
        );
    }


    if (
      dy !== 0
    ) {

      ySlack =
        getSlackForAxis(
          finalTower,
          dx,
          dy,
          "y",
          sign(dy)
        );
    }


    return {

      xSlack,

      ySlack,
    };
  }


  // ==================================================
  // ピッタリ・余裕の文章
  // ==================================================

  function buildSlackNotes(
    dx,
    dy,
    route
  ) {

    const {

      mainAxis,

    } =
      getDirectionInfo(
        dx,
        dy
      );


    const {

      xSlack,

      ySlack,

    } =
      calculateRouteSlack(
        dx,
        dy,
        route
      );


    const notes = [];


    /**
     * 主方向を先に表示。
     */
    const axisOrder =
      mainAxis === "x"
        ? [
            "x",
            "y",
          ]
        : [
            "y",
            "x",
          ];


    for (
      const axis
      of axisOrder
    ) {

      const direction =
        getAxisDirection(
          axis,
          dx,
          dy
        );


      if (
        direction === null
      ) {
        continue;
      }


      const slack =
        axis === "x"
          ? xSlack
          : ySlack;


      if (
        slack === null
      ) {
        continue;
      }


      // --------------------------------------
      // ピッタリ
      // --------------------------------------

      if (
        slack === 0
      ) {

        if (
          axis === "x"
        ) {

          notes.push(

            `【強調】${direction}方向にはピッタリ【/強調】` +

            `のため、` +

            `【強調】横方向の建設位置にご注意ください【/強調】。`
          );

        } else {

          notes.push(

            `【強調】${direction}方向にはピッタリ【/強調】` +

            `のため、` +

            `【強調】${direction}方向の建設位置にご注意ください【/強調】。`
          );
        }


        continue;
      }


      // --------------------------------------
      // 余裕あり
      // --------------------------------------

      notes.push(

        `【強調】${direction}方向に${slack}マスの余裕【/強調】` +

        `があります。`
      );
    }


    return notes;
  }


  // ==================================================
  // 真上・真下・真横
  // ==================================================

  function buildStraightNote(
    dx,
    dy
  ) {

    const mainAxis =
      getMainAxis(
        dx,
        dy
      );


    const sideDistance =
      mainAxis === "y"
        ? Math.abs(dx)
        : Math.abs(dy);


    /**
     * 副方向2マス以内を
     * 「概ね直線」とする。
     */
    if (
      sideDistance > 2
    ) {

      return null;
    }


    if (
      mainAxis === "y"
    ) {

      const direction =
        dy > 0
          ? "上"
          : "下";


      const positionText =
        sideDistance === 0
          ? `真${direction}`
          : `概ね真${direction}`;


      return (

        `目的地は` +

        `【強調】${positionText}【/強調】` +

        `にあるため、` +

        `【強調】左右は大きくずらさなければ問題ありません【/強調】。`
      );
    }


    const positionText =
      sideDistance === 0
        ? "真横"
        : "概ね真横";


    return (

      `目的地は` +

      `【強調】${positionText}【/強調】` +

      `のため、` +

      `【強調】上下は大きくずらさなければ問題ありません【/強調】。`
    );
  }


  // ==================================================
  // 途中から直進する案内
  // ==================================================

  function buildRoutePhaseNotes(
    dx,
    dy,
    route
  ) {

    const {

      mainAxis,

      mainDirection,

      sideDirection,

    } =
      getDirectionInfo(
        dx,
        dy
      );


    if (
      sideDirection === null
    ) {

      return [];
    }


    const sideDistance =
      mainAxis === "y"
        ? Math.abs(dx)
        : Math.abs(dy);


    /**
     * 1個目：
     * 副方向へ最大1
     *
     * 2個目以降：
     * 副方向へ最大2
     */
    const adjustUntil =
      sideDistance <= 1
        ? 1
        : (
          1 +
          Math.ceil(
            (
              sideDistance -
              1
            ) /
            2
          )
        );


    /**
     * 到着直前まで斜めなら、
     * 無理にこの説明を出さない。
     */
    if (
      adjustUntil >
      route.length -
      2
    ) {

      return [];
    }


    let straightText;


    if (
      mainAxis === "y"
    ) {

      straightText =
        mainDirection === "上"
          ? "ほぼ真上"
          : "ほぼ真下";

    } else {

      straightText =
        "ほぼ真横";
    }


    return [

      (
        `【強調】${adjustUntil}個目あたりまで【/強調】は、` +

        `${mainDirection}側に接するように` +

        `【強調】やや${sideDirection}寄り【/強調】` +

        `で建設してください。`
      ),


      (
        `その後は目的地が` +

        `【強調】${straightText}【/強調】` +

        `になるため、` +

        `【強調】${straightText}【/強調】` +

        `に建設していけば到達できます。`
      ),
    ];
  }


  // ==================================================
  // 建設ポイント
  // ==================================================

  function buildGuidance(
    dx,
    dy,
    route
  ) {

    const notes = [];


    // --------------------------------------
    // ① 最初の建設位置
    // --------------------------------------

    notes.push(
      buildStartInstruction(
        dx,
        dy
      )
    );


    // --------------------------------------
    // ② ピッタリ・余裕
    // --------------------------------------

    notes.push(
      ...buildSlackNotes(
        dx,
        dy,
        route
      )
    );


    // --------------------------------------
    // ③ ほぼ直線
    // --------------------------------------

    const straightNote =
      buildStraightNote(
        dx,
        dy
      );


    if (
      straightNote
    ) {

      notes.push(
        straightNote
      );


      return notes;
    }


    // --------------------------------------
    // ④ 途中からほぼ直進
    // --------------------------------------

    notes.push(
      ...buildRoutePhaseNotes(
        dx,
        dy,
        route
      )
    );


    return notes;
  }


  // ==================================================
  // メイン計算
  // ==================================================

  function calculateWatchtowers(
    startX,
    startY,
    destinationX,
    destinationY
  ) {

    const start =
      normalizePoint(
        startX,
        startY
      );


    const destination =
      normalizePoint(
        destinationX,
        destinationY
      );


    const dx =
      destination.cellX -
      start.cellX;


    const dy =
      destination.cellY -
      start.cellY;


    // --------------------------------------------------
    // 既に接している場合
    // --------------------------------------------------

    if (
      isAlreadyConnected(
        dx,
        dy
      )
    ) {

      return {

        status:
          "already_connected",

        start,

        destination,

        dx,

        dy,

        count:
          0,

        message:
          "目的地には接しているようです。スタート地点、または目的地の座標入力に誤りがないか確認してください。",

        route: [],

        routeCoordinates: [],

        guidance: [],
      };
    }


    // --------------------------------------------------
    // 最短ルート
    // --------------------------------------------------

    const shortest =
      findShortestRoute(
        dx,
        dy
      );


    // --------------------------------------------------
    // 推奨建築座標
    // --------------------------------------------------

    const routeCoordinates =
      shortest.route.map(
        (
          tower,
          index
        ) => {

          const absoluteCellX =
            start.cellX +
            tower.x;


          const absoluteCellY =
            start.cellY +
            tower.y;


          return {

            number:
              index + 1,

            relativeCellX:
              tower.x,

            relativeCellY:
              tower.y,

            x:
              cellIndexToRepresentative(
                absoluteCellX
              ),

            y:
              cellIndexToRepresentative(
                absoluteCellY
              ),
          };
        }
      );


    // --------------------------------------------------
    // 建設ポイント
    // --------------------------------------------------

    const guidance =
      buildGuidance(
        dx,
        dy,
        shortest.route
      );


    return {

      status:
        "ok",

      start,

      destination,

      dx,

      dy,

      count:
        shortest.count,

      route:
        shortest.route,

      routeCoordinates,

      guidance,
    };
  }


  // ==================================================
  // HTML側へ公開
  // ==================================================

  window.WatchtowerCalculator = {

    calculate:
      calculateWatchtowers,
  };

})();