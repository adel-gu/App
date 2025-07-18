import {Str} from 'expensify-common';
import React, {useCallback, useEffect, useRef} from 'react';
import {View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import type {ValueOf} from 'type-fest';
import Avatar from '@components/Avatar';
import Badge from '@components/Badge';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import type {PopoverMenuItem} from '@components/PopoverMenu';
import Text from '@components/Text';
import TextWithTooltip from '@components/TextWithTooltip';
import ThreeDotsMenu from '@components/ThreeDotsMenu';
import Tooltip from '@components/Tooltip';
import type {WithCurrentUserPersonalDetailsProps} from '@components/withCurrentUserPersonalDetails';
import withCurrentUserPersonalDetails from '@components/withCurrentUserPersonalDetails';
import WorkspacesListRowDisplayName from '@components/WorkspacesListRowDisplayName';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {getDisplayNameOrDefault, getPersonalDetailsByIDs} from '@libs/PersonalDetailsUtils';
import {getUserFriendlyWorkspaceType} from '@libs/PolicyUtils';
import type {AvatarSource} from '@libs/UserUtils';
import type {AnchorPosition} from '@styles/index';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type IconAsset from '@src/types/utils/IconAsset';

type WorkspacesListRowProps = WithCurrentUserPersonalDetailsProps & {
    /** Name of the workspace */
    title: string;

    /** Account ID of the workspace's owner */
    ownerAccountID?: number;

    /** Type of workspace */
    workspaceType?: ValueOf<typeof CONST.POLICY.TYPE>;

    /** Icon to show next to the workspace name */
    workspaceIcon?: AvatarSource;

    /** Icon to be used when workspaceIcon is not present */
    fallbackWorkspaceIcon?: AvatarSource;

    /** Items for the three dots menu */
    menuItems: PopoverMenuItem[];

    /** Renders the component using big screen layout or small screen layout. When layoutWidth === WorkspaceListRowLayout.NONE,
     * component will return null to prevent layout from jumping on initial render and when parent width changes. */
    layoutWidth?: ValueOf<typeof CONST.LAYOUT_WIDTH>;

    /** Custom styles applied to the row */
    rowStyles?: StyleProp<ViewStyle>;

    /** Additional styles from OfflineWithFeedback applied to the row */
    style?: StyleProp<ViewStyle>;

    /** The type of brick road indicator to show. */
    brickRoadIndicator?: ValueOf<typeof CONST.BRICK_ROAD_INDICATOR_STATUS>;

    /** Determines if three dots menu should be shown or not */
    shouldDisableThreeDotsMenu?: boolean;

    /** Determines if pending column should be shown or not */
    isJoinRequestPending?: boolean;

    /** ID of the policy */
    policyID?: string;

    /** Is default policy */
    isDefault?: boolean;

    /** Whether the bill is loading */
    isLoadingBill?: boolean;

    /** Function to reset loading spinner icon index */
    resetLoadingSpinnerIconIndex?: () => void;
};

type BrickRoadIndicatorIconProps = {
    brickRoadIndicator?: ValueOf<typeof CONST.BRICK_ROAD_INDICATOR_STATUS>;
};

const workspaceTypeIcon = (workspaceType: WorkspacesListRowProps['workspaceType']): IconAsset => {
    switch (workspaceType) {
        case CONST.POLICY.TYPE.CORPORATE:
            return Illustrations.ShieldYellow;
        case CONST.POLICY.TYPE.TEAM:
            return Illustrations.Mailbox;
        default:
            return Illustrations.Mailbox;
    }
};

function BrickRoadIndicatorIcon({brickRoadIndicator}: BrickRoadIndicatorIconProps) {
    const theme = useTheme();

    return brickRoadIndicator ? (
        <Icon
            src={Expensicons.DotIndicator}
            fill={brickRoadIndicator === CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR ? theme.danger : theme.iconSuccessFill}
        />
    ) : null;
}

function WorkspacesListRow({
    title,
    menuItems,
    workspaceIcon,
    fallbackWorkspaceIcon,
    ownerAccountID,
    workspaceType,
    currentUserPersonalDetails,
    layoutWidth = CONST.LAYOUT_WIDTH.NONE,
    rowStyles,
    style,
    brickRoadIndicator,
    shouldDisableThreeDotsMenu,
    isJoinRequestPending,
    policyID,
    isDefault,
    isLoadingBill,
    resetLoadingSpinnerIconIndex,
}: WorkspacesListRowProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const threeDotsMenuContainerRef = useRef<View>(null);
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const ownerDetails = ownerAccountID && getPersonalDetailsByIDs({accountIDs: [ownerAccountID], currentUserAccountID: currentUserPersonalDetails.accountID}).at(0);
    const threeDotsMenuRef = useRef<{hidePopoverMenu: () => void; isPopupMenuVisible: boolean}>(null);

    useEffect(() => {
        if (isLoadingBill) {
            return;
        }
        resetLoadingSpinnerIconIndex?.();

        if (!threeDotsMenuRef.current?.isPopupMenuVisible) {
            return;
        }
        threeDotsMenuRef?.current?.hidePopoverMenu();
    }, [isLoadingBill, resetLoadingSpinnerIconIndex]);

    const calculateAndSetThreeDotsMenuPosition = useCallback(() => {
        if (shouldUseNarrowLayout) {
            return Promise.resolve({horizontal: 0, vertical: 0});
        }
        return new Promise<AnchorPosition>((resolve) => {
            threeDotsMenuContainerRef.current?.measureInWindow((x, y, width, height) => {
                resolve({
                    horizontal: x + width,
                    vertical: y + height,
                });
            });
        });
    }, [shouldUseNarrowLayout]);

    if (layoutWidth === CONST.LAYOUT_WIDTH.NONE) {
        // To prevent layout from jumping or rendering for a split second, when
        // isWide is undefined we don't assume anything and simply return null.
        return null;
    }

    const isWide = layoutWidth === CONST.LAYOUT_WIDTH.WIDE;
    const isNarrow = layoutWidth === CONST.LAYOUT_WIDTH.NARROW;

    const isDeleted = style && Array.isArray(style) ? style.includes(styles.offlineFeedback.deleted) : false;

    const ThreeDotMenuOrPendingIcon = (
        <View style={[styles.flexRow, !shouldUseNarrowLayout && styles.workspaceThreeDotMenu]}>
            {!!isJoinRequestPending && (
                <View style={[styles.flexRow, styles.gap2, styles.alignItemsCenter, styles.justifyContentEnd]}>
                    <Badge
                        text={translate('workspace.common.requested')}
                        textStyles={styles.textStrong}
                        badgeStyles={[styles.alignSelfCenter, styles.badgeBordered]}
                        icon={Expensicons.Hourglass}
                    />
                </View>
            )}
            {!!isDefault && (
                <Tooltip
                    maxWidth={variables.w184}
                    text={translate('workspace.common.defaultNote')}
                    numberOfLines={4}
                >
                    <View style={[styles.flexRow, styles.gap2, styles.alignItemsCenter, styles.justifyContentEnd]}>
                        <Badge
                            text={translate('common.default')}
                            textStyles={styles.textStrong}
                            badgeStyles={[styles.alignSelfCenter, styles.badgeBordered, styles.badgeSuccess]}
                        />
                    </View>
                </Tooltip>
            )}
            {!isJoinRequestPending && (
                <View style={[styles.flexRow, styles.ml2, styles.gap1]}>
                    <View style={[styles.flexRow, styles.gap2, styles.alignItemsCenter, isNarrow && styles.workspaceListRBR]}>
                        <BrickRoadIndicatorIcon brickRoadIndicator={brickRoadIndicator} />
                    </View>
                    <View ref={threeDotsMenuContainerRef}>
                        <ThreeDotsMenu
                            getAnchorPosition={calculateAndSetThreeDotsMenuPosition}
                            menuItems={menuItems}
                            anchorAlignment={{horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT, vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP}}
                            shouldOverlay
                            disabled={shouldDisableThreeDotsMenu}
                            isNested
                            threeDotsMenuRef={threeDotsMenuRef}
                        />
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.flexRow, styles.highlightBG, rowStyles, style, isWide && styles.gap5, styles.br3, styles.p5]}>
            <View style={[isWide ? styles.flexRow : styles.flexColumn, styles.flex1, isWide && styles.gap5]}>
                <View style={[styles.flexRow, styles.justifyContentBetween, styles.flex2, isNarrow && styles.mb3, styles.alignItemsCenter]}>
                    <View style={[styles.flexRow, styles.gap3, styles.flex1, styles.alignItemsCenter]}>
                        <Avatar
                            imageStyles={[styles.alignSelfCenter]}
                            size={CONST.AVATAR_SIZE.DEFAULT}
                            source={workspaceIcon}
                            fallbackIcon={fallbackWorkspaceIcon}
                            avatarID={policyID}
                            name={title}
                            type={CONST.ICON_TYPE_WORKSPACE}
                        />
                        <TextWithTooltip
                            text={title}
                            shouldShowTooltip
                            style={[styles.flex1, styles.flexGrow1, styles.textStrong, isDeleted ? styles.offlineFeedback.deleted : {}]}
                        />
                    </View>
                    {shouldUseNarrowLayout && ThreeDotMenuOrPendingIcon}
                </View>
                <View style={[styles.flexRow, isWide && styles.flex1, isWide && styles.workspaceOwnerSectionMinWidth, styles.gap2, styles.alignItemsCenter]}>
                    {!!ownerDetails && (
                        <>
                            <Avatar
                                source={ownerDetails.avatar}
                                avatarID={ownerDetails.accountID}
                                type={CONST.ICON_TYPE_AVATAR}
                                size={CONST.AVATAR_SIZE.SMALL}
                                containerStyles={styles.workspaceOwnerAvatarWrapper}
                            />
                            <View style={styles.flex1}>
                                <WorkspacesListRowDisplayName
                                    isDeleted={isDeleted}
                                    ownerName={getDisplayNameOrDefault(ownerDetails)}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[styles.textMicro, styles.textSupporting, isDeleted ? styles.offlineFeedback.deleted : {}]}
                                >
                                    {Str.removeSMSDomain(ownerDetails?.login ?? '')}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
                <View style={[styles.flexRow, isWide && styles.flex1, styles.gap2, styles.alignItemsCenter]}>
                    <Icon
                        src={workspaceTypeIcon(workspaceType)}
                        width={variables.workspaceTypeIconWidth}
                        height={variables.workspaceTypeIconWidth}
                        additionalStyles={styles.workspaceTypeWrapper}
                    />
                    <View>
                        {!!workspaceType && (
                            <Text
                                numberOfLines={1}
                                style={[styles.labelStrong, isDeleted ? styles.offlineFeedback.deleted : {}]}
                            >
                                {getUserFriendlyWorkspaceType(workspaceType)}
                            </Text>
                        )}
                        <Text
                            numberOfLines={1}
                            style={[styles.textMicro, styles.textSupporting, isDeleted ? styles.offlineFeedback.deleted : {}]}
                        >
                            {translate('workspace.common.plan')}
                        </Text>
                    </View>
                </View>
            </View>

            {!shouldUseNarrowLayout && ThreeDotMenuOrPendingIcon}
        </View>
    );
}

WorkspacesListRow.displayName = 'WorkspacesListRow';

export default withCurrentUserPersonalDetails(WorkspacesListRow);
