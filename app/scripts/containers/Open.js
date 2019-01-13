import { connect } from 'react-redux';
import { getOpenRows } from 'selectors/open';
import Open from 'components/Open';
import uiSetView from 'store/ui/set-view';
import toggleSecondRow from 'store/ui-open/toggle-second-row';

const mapStateToProps = state => {
    return {
        secondRowVisible: state.uiOpen.secondRowVisible,
        locale: state.locale,
        files: state.files,
        canOpen: state.settings.canOpen,
        canRemoveLatest: state.settings.canRemoveLatest,
        canOpenKeyFromDropbox: false,
        ...getOpenRows(state),
    };
};

const mapDispatchToProps = dispatch => {
    return {
        onClick(e) {
            switch (e.button) {
                case 'more':
                    return dispatch(toggleSecondRow());
                case 'settings':
                    return dispatch(uiSetView('settings'));
            }
        },
        onFileClick() {},
        onFileInputChange(e) {
            switch (e.button) {
                case 'open':
                    // dispatch(openFile(e.file));
                    break;
            }
        },
    };
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Open);