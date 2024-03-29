import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import TextField from '@mui/material/TextField';

import { StoreContext } from '../../store';
import { valueExists } from '../../utils/cases';
import DateInputMask from '../DateInput';
import InputHelperText from './InputHelperText';

interface Props {
    variable: CaseVariableConfig;
    value?: VariableValue;
    hideLabel?: boolean;
    hideHelperText?: boolean;
    errors: string[];
    onErrors: (errors: string[]) => void;
    onChange: (value?: VariableValue) => void;
}

const VariableInput = ({ variable, value, hideLabel, hideHelperText, errors, onErrors, onChange }: Props) => {
    const [state] = React.useContext(StoreContext);

    const [isDirty, updateIsDirty] = React.useState(false);

    const hasErrors = errors.length > 0;

    const defaultValue = state.selectedSite?.config?.find((v) => v.name === variable.name)?.value || variable.default;

    const label = variable.label || variable.name;

    const { description } = variable;
    const helperText = hideHelperText ? null : <InputHelperText description={description} errors={errors} />;

    const handleChange = (inputValue?: VariableValue | Date | null) => {
        const variableErrors: string[] = [];

        let changedValue = inputValue;

        if (changedValue) {
            const arrayValue: Array<Date | VariableValue> = Array.isArray(changedValue) ? changedValue : [changedValue];

            const { validation, type, allow_custom } = variable;

            const choices = [...(validation?.choices || [])];
            arrayValue.forEach((v) => {
                if (allow_custom) {
                    choices.push({ value: v as VariableValue, label: v.toString() });
                }

                if (validation?.choices && choices.findIndex((c) => c.value === v) === -1) {
                    variableErrors.push(`${label} must be one of ${choices.map((c) => c.label).join(', ')}`);
                } else if (validation?.pattern && !new RegExp(validation.pattern).test(v.toString())) {
                    if (validation?.pattern_error) {
                        variableErrors.push(validation.pattern_error);
                    } else {
                        variableErrors.push(`${label} must match ${validation.pattern}`);
                    }
                } else if (type === 'integer' || type === 'float') {
                    const numberValue = Number(v);
                    if (Number.isNaN(numberValue)) {
                        variableErrors.push(`${label} must be a number`);
                    } else {
                        const minValue = Number(validation?.min);
                        const maxValue = Number(validation?.max);
                        if (!Number.isNaN(minValue) && numberValue < minValue) {
                            variableErrors.push(`${label} must be greater than or equal to ${minValue}`);
                        }
                        if (maxValue && numberValue > maxValue) {
                            variableErrors.push(`${label} must be less than or equal to ${maxValue}`);
                        }
                    }
                } else if (type === 'date') {
                    const newDate = v as string | undefined;
                    if (newDate) {
                        const [year, month, day] = newDate.split('-').map(Number);
                        if (
                            !year ||
                            Number.isNaN(year) ||
                            !month ||
                            Number.isNaN(month) ||
                            !day ||
                            Number.isNaN(day) ||
                            month < 1 ||
                            month > 12 ||
                            day < 1 ||
                            day > 31
                        ) {
                            variableErrors.push(`${label} must be a valid date in YYYY-MM-DD format`);
                        }
                    }
                    changedValue = newDate;
                }
            });
        }
        onErrors(variableErrors);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        onChange(changedValue);
        if (!isDirty) {
            updateIsDirty(true);
        }
    };

    if (variable.readonly) {
        return (
            <FormControl size="small" margin="normal">
                <TextField
                    disabled
                    label={hideLabel ? null : label}
                    helperText={helperText}
                    size="small"
                    margin="dense"
                    value={defaultValue?.toString()}
                />
            </FormControl>
        );
    }

    if (variable.validation?.choices) {
        const { choices } = variable.validation;

        if (variable.allow_multiple) {
            const autocompleteValues: VariableValue[] = [];
            const autocompleteValuesObject: VariableChoice[] = [];
            ((valueExists(value) ? value : defaultValue || []) as VariableValue[]).forEach((v) => {
                autocompleteValues.push(v.toString());
                autocompleteValuesObject.push({
                    value: v,
                    label: choices.find((c) => c.value === v)?.label || v.toString()
                });
            });

            return (
                <FormControl size="small" margin="normal">
                    <Autocomplete
                        sx={{ minWidth: 225 }}
                        multiple
                        freeSolo={variable.allow_custom}
                        options={choices}
                        disableCloseOnSelect={variable.allow_multiple}
                        filterOptions={() => choices.filter((c) => !autocompleteValues.includes(c.value))}
                        filterSelectedOptions
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                error={hasErrors}
                                size="small"
                                margin="dense"
                                label={hideLabel ? null : label}
                                InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                                InputProps={{
                                    ...params.InputProps,
                                    notched: true,
                                    placeholder: variable.placeholder
                                }}
                            />
                        )}
                        value={autocompleteValuesObject}
                        onChange={(_event, newValue) => {
                            handleChange(newValue.map((v) => (typeof v === 'string' ? v : v.value)) as VariableValue);
                        }}
                    />
                    <FormHelperText>{helperText}</FormHelperText>
                </FormControl>
            );
        }

        let autocompleteValueObject: VariableChoice | null;
        if (valueExists(value)) {
            autocompleteValueObject = {
                value: value as VariableValue,
                label: choices.find((c) => c.value === value)?.label || value?.toString() || ''
            };
        } else if (valueExists(defaultValue)) {
            autocompleteValueObject = {
                value: defaultValue as VariableValue,
                label: choices.find((c) => c.value === defaultValue)?.label || defaultValue?.toString() || ''
            };
        } else {
            autocompleteValueObject = null;
        }

        return (
            <FormControl size="small" margin="normal">
                <Autocomplete
                    sx={{ minWidth: 225 }}
                    freeSolo={variable.allow_custom}
                    options={choices}
                    filterOptions={() => choices.filter((c) => c.value !== value)}
                    filterSelectedOptions
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            error={hasErrors}
                            size="small"
                            margin="dense"
                            label={hideLabel ? null : label}
                            InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                            InputProps={{
                                ...params.InputProps,
                                notched: true,
                                placeholder: variable.placeholder
                            }}
                        />
                    )}
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    isOptionEqualToValue={(option, v) => option.value === v.value}
                    value={autocompleteValueObject}
                    onChange={(_event, newValue) => {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        handleChange(newValue?.value);
                    }}
                />
                <FormHelperText>{helperText}</FormHelperText>
            </FormControl>
        );
    }

    switch (variable.type) {
        case 'char':
        case 'integer':
        case 'float':
            return (
                <FormControl size="small" margin="normal">
                    <TextField
                        error={hasErrors}
                        label={hideLabel ? null : label}
                        helperText={helperText}
                        size="small"
                        margin="dense"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                            notched: true,
                            inputProps: {
                                placeholder: variable.placeholder
                            }
                        }}
                        value={isDirty ? value : value || defaultValue?.toString() || ''}
                        onChange={(e) => handleChange(e.target.value)}
                    />
                </FormControl>
            );
        case 'date':
            return (
                <FormControl size="small" margin="normal" error={hasErrors}>
                    <TextField
                        error={hasErrors}
                        label={hideLabel ? null : label}
                        helperText={helperText}
                        size="small"
                        margin="dense"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                            notched: true,
                            inputComponent: DateInputMask as any,
                            inputProps: {
                                placeholder: variable.placeholder
                            }
                        }}
                        value={isDirty ? value : value || defaultValue?.toString()}
                        onChange={(e) => handleChange(e.target.value)}
                    />
                </FormControl>
            );
        case 'logical':
            return (
                <FormControl size="small" margin="normal">
                    <FormControlLabel
                        label={hideLabel ? null : label}
                        control={
                            <Checkbox
                                checked={!!(valueExists(value) ? value : defaultValue)}
                                onChange={(e) => onChange(e.target.checked)}
                            />
                        }
                    />
                    <FormHelperText>{helperText}</FormHelperText>
                </FormControl>
            );
        default:
            throw new Error(`Unknown variable type: ${variable.type}`);
    }
};

export default VariableInput;
