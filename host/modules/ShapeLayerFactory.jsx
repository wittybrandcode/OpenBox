/**
 * OPENBOX - Host Engine
 * Module: ShapeLayerFactory.jsx
 * Version: 1.0.0 (Unified Shape Layer Factory Architecture)
 * 
 * Centralized Factory for Highlight Shape Layers:
 * - Unifies shape layer creation across Line, Word, and Phrase highlight modes.
 * - Injects Effect Parade controls (Use Master Controls, Local Color, Padding, Offset, Roundness, Opacity, Progress).
 * - Links dynamic expressions for Opacity, Size, Position, and Scale via Recipes.
 * - Supports Single Shape Layer Mode (vector groups consolidated in one layer) and Multi-Layer Mode.
 */

if (!$._smartHighlighter) $._smartHighlighter = {};

$._smartHighlighter.createHighlightShapeLayer = function (comp, parentLayer, box, ctx, options) {
    if (!comp || !parentLayer || !box) return null;
    options = options || {};

    var styleRecipe = ctx.style || ($._smartHighlighter.recipes ? $._smartHighlighter.recipes.getStyle(box.style || "box") : null);
    var motionRecipe = ctx.motion || ($._smartHighlighter.recipes ? $._smartHighlighter.recipes.getMotion(box.motion || "wipe") : null);
    var tag = options.comment || $._smartHighlighter.LAYER_COMMENT || "SMART_HL_PRO_LAYER";
    var prevSnap = options.prevSnap || null;
    var isLocalCustom = (prevSnap && prevSnap.useMaster === 0);

    var shapeLayer = null;
    var isConsolidated = (options.singleLayer === true && options.masterLayer);

    if (isConsolidated) {
        shapeLayer = options.masterLayer;
    } else {
        shapeLayer = comp.layers.addShape();
        shapeLayer.name = box.name || (parentLayer.name + " - Highlight");
        shapeLayer.comment = tag;

        if (options.lastLayer) {
            try { shapeLayer.moveAfter(options.lastLayer); } catch (eMove) {}
        }
        shapeLayer.parent = parentLayer;

        var xform = shapeLayer.property("ADBE Transform Group");
        xform.property("ADBE Position").setValue([0, 0]);
        xform.property("ADBE Anchor Point").expression = "hasParent ? parent.transform.anchorPoint : value;";
        xform.property("ADBE Scale").setValue([100, 100]);

        // Blending mode & Layer setup (delegated to style recipe)
        if (styleRecipe && styleRecipe.setupLayer) {
            styleRecipe.setupLayer(shapeLayer, ctx);
        } else {
            if (box.style === "marker") {
                var tilts = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.7];
                var kTilt = (typeof ctx.index === "number") ? ctx.index : 0;
                xform.property("ADBE Rotate Z").setValue(tilts[kTilt % tilts.length]);
                shapeLayer.blendingMode = BlendingMode.MULTIPLY;
            } else {
                xform.property("ADBE Rotate Z").setValue(0);
                shapeLayer.blendingMode = BlendingMode.NORMAL;
            }
        }

        // Effect Controls Parade
        var fx = shapeLayer.property("ADBE Effect Parade");
        var chk = fx.addProperty("ADBE Checkbox Control");
        chk.name = "Use Master Controls";
        var useMVal = (options.useMasterDefault !== undefined) ? options.useMasterDefault : (isLocalCustom ? 0 : 1);
        chk.property(1).setValue(useMVal);

        var colFx = fx.addProperty("ADBE Color Control");
        colFx.name = "Local Color";
        var initCol = (isLocalCustom && prevSnap.color) ? prevSnap.color : (options.defaultColor || box.color || [1, 0.9, 0, 1]);
        if (typeof initCol === "string" && $._smartHighlighter.hexToRgba) {
            initCol = $._smartHighlighter.hexToRgba(initCol);
        }
        colFx.property(1).setValue(initCol);

        var pXFx = fx.addProperty("ADBE Slider Control");
        pXFx.name = "Local Padding X";
        var initPadX = (isLocalCustom && prevSnap.padX !== null) ? prevSnap.padX : ((options.defaultPadX !== undefined) ? options.defaultPadX : (box.paddingX !== undefined ? box.paddingX : 8));
        pXFx.property(1).setValue(initPadX);

        var pYFx = fx.addProperty("ADBE Slider Control");
        pYFx.name = "Local Padding Y";
        var initPadY = (isLocalCustom && prevSnap.padY !== null) ? prevSnap.padY : ((options.defaultPadY !== undefined) ? options.defaultPadY : (box.paddingY !== undefined ? box.paddingY : 4));
        pYFx.property(1).setValue(initPadY);

        var offFx = fx.addProperty("ADBE Slider Control");
        offFx.name = "Local Offset Y";
        var initOffY = (isLocalCustom && prevSnap.offY !== null) ? prevSnap.offY : ((options.defaultOffY !== undefined) ? options.defaultOffY : 0);
        offFx.property(1).setValue(initOffY);

        var rndFx = fx.addProperty("ADBE Slider Control");
        rndFx.name = "Local Roundness";
        var initRnd = (isLocalCustom && prevSnap.round !== null) ? prevSnap.round : ((options.defaultRound !== undefined) ? options.defaultRound : (box.roundness !== undefined ? box.roundness : 0));
        rndFx.property(1).setValue(initRnd);

        var opacFx = fx.addProperty("ADBE Slider Control");
        opacFx.name = "Local Opacity";
        var initOpac = (isLocalCustom && prevSnap.opacity !== null && prevSnap.opacity !== undefined) ? prevSnap.opacity : ((options.defaultOpacity !== undefined) ? options.defaultOpacity : 100);
        opacFx.property(1).setValue(initOpac);

        var progFx = fx.addProperty("ADBE Slider Control");
        progFx.name = "Progress";
        progFx.property(1).setValue(100);

        // Opacity Expression
        if (options.opacityExpression) {
            xform.property("ADBE Opacity").expression = options.opacityExpression;
        } else {
            var opacityCond = (motionRecipe && motionRecipe.getOpacityCondition)
                ? motionRecipe.getOpacityCondition(ctx)
                : ((box.motion === "typewriter" && ctx.timing && ctx.timing.revealUnit === "lines") ? '(prog < 50) ? 0 : baseOp;' : '(prog <= 0) ? 0 : baseOp;');

            xform.property("ADBE Opacity").expression =
                'var pLayer = hasParent ? parent : null;\n' +
                'var useM = 1; try { useM = effect("Use Master Controls")(1); } catch (eM) {}\n' +
                'var mOp = 100; try { mOp = (pLayer && pLayer.effect("Master Highlight Opacity")) ? pLayer.effect("Master Highlight Opacity")(1) : 100; } catch (eMOp) {}\n' +
                'var lOp = 100; try { lOp = effect("Local Opacity")(1); } catch (eLOp) {}\n' +
                'var baseOp = (useM == 1) ? mOp : lOp;\n' +
                'var prog = 100; try { prog = effect("Progress")(1); } catch (eP) {}\n' +
                opacityCond;
        }

        // Scale transform expression (delegated to motion recipe)
        if (motionRecipe && motionRecipe.applyTransformScale) {
            motionRecipe.applyTransformScale(xform.property("ADBE Scale"), ctx);
        }

        // Animation timing / Progress application
        if (options.animateProgress) {
            options.animateProgress(progFx.property(1), ctx);
        }
    }

    // Vector Graphics Setup
    var contents = shapeLayer.property("ADBE Root Vectors Group");
    var groupName = options.groupName || (isConsolidated ? ("Box Group " + (ctx.index + 1)) : "Box Group");
    var group = contents.addProperty("ADBE Vector Group");
    group.name = groupName;
    var gContents = group.property("ADBE Vectors Group");

    var rect = gContents.addProperty("ADBE Vector Shape - Rect");
    rect.name = "Box";

    // Size expression (delegated to style recipe)
    if (styleRecipe && styleRecipe.getSizeExpression) {
        rect.property("ADBE Vector Rect Size").expression = styleRecipe.getSizeExpression(ctx);
    }

    // Position expression (delegated to style recipe)
    if (styleRecipe && styleRecipe.getPositionExpression) {
        rect.property("ADBE Vector Rect Position").expression = styleRecipe.getPositionExpression(ctx);
    }

    // Roundness Expression (Safely clamped so it never exceeds half-height)
    rect.property("ADBE Vector Rect Roundness").expression =
        'var pLayer = hasParent ? parent : null;\n' +
        'var useM = 1; try { useM = effect("Use Master Controls")(1); } catch(eU) {}\n' +
        'var r = (useM == 1 && pLayer && pLayer.effect("Master Roundness")) ? pLayer.effect("Master Roundness")(1) : effect("Local Roundness")(1);\n' +
        'var sz = thisProperty.propertyGroup(1).size;\n' +
        'Math.min(Math.max(0, r), Math.min(sz[0], sz[1]) / 2);';

    // Graphics: Fill vs Stroke (delegated to style recipe)
    if (styleRecipe && styleRecipe.buildGraphics) {
        styleRecipe.buildGraphics(gContents, ctx);
    }

    return shapeLayer;
};

var SMART_HL_SHAPELAYERFACTORY_LOADED = true;
